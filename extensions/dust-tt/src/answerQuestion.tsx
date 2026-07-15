import { AgentActionPublicType, DataSourceViewType, DustAPI } from "@dust-tt/client";
import { Action, ActionPanel, Color, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { createParser } from "eventsource-parser";
import { useEffect, useState } from "react";
import { fetch as undiciFetch } from "undici";
import { AskAgentQuestionForm } from "./askAgent";
import { getDustClient, withPickedWorkspace } from "./dust_api/oauth";
import { addDustHistory } from "./history";
import { AgentType, ConnectorProviders, DUST_AGENT, getUser } from "./utils";

type DustDocument = {
  documentId: string;
  sourceUrl: string | null;
  dataSourceView: DataSourceViewType | null;
  reference: string;
  referenceCount: number;
};

type ConversationContext = {
  timezone: string;
  username: string;
  email: string | null;
  fullName: string;
  profilePictureUrl: string | null;
  origin: "raycast";
};

const useConversationContext = () => {
  const { data: user, isLoading } = usePromise(async () => {
    return await getUser();
  }, []);

  let context: ConversationContext | undefined = undefined;

  if (user && !isLoading) {
    context = {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      username: user.firstName,
      email: user.email,
      fullName: user.fullName,
      profilePictureUrl: user.image,
      origin: "raycast",
    };
  }

  return { context, isLoading };
};

async function answerQuestion({
  question,
  dustApi,
  context,
  setDustAnswer,
  setConversationId,
  setConversationTitle,
  setDustDocuments,
  agent = DUST_AGENT,
  signal,
}: {
  question: string;
  dustApi: DustAPI;
  context: ConversationContext;
  setDustAnswer: (answer: string) => void;
  setConversationId: (conversationId: string) => void;
  setConversationTitle: (conversationTitle: string) => void;
  setDustDocuments: (documents: DustDocument[]) => void;
  agent?: AgentType;
  signal: AbortSignal;
}) {
  function removeCiteMention(message: string) {
    const regex = / ?:cite\[[a-zA-Z0-9, ]+\]/g;
    return message.replace(regex, "");
  }

  function processAction({
    content,
    setDustDocuments,
  }: {
    content: string;
    action?: AgentActionPublicType;
    setDustDocuments: (documents: DustDocument[]) => void;
  }): string {
    const referencedDocuments: Map<string, DustDocument> = new Map();
    /**
     * if (action && action.documents) {
     *   action.documents.forEach((d) => {
     *     referencedDocuments.set(d.reference, { ...d, referenceCount: 0 });
     *   });
     * }
     */
    const documents: DustDocument[] = [];
    if (referencedDocuments.size > 0) {
      let counter = 0;
      const refCounter: { [key: string]: number } = {};
      const contentWithLinks = content.replace(/:cite\[[a-zA-Z0-9, ]+\]/g, (match) => {
        const keys = match.slice(6, -1).split(","); // slice off ":cite[" and "]" then split by comma
        return keys
          .map((key) => {
            const k = key.trim();
            const ref = referencedDocuments.get(k);
            if (ref) {
              let newDoc = false;
              if (!refCounter[k]) {
                counter++;
                refCounter[k] = counter;
                newDoc = true;
              }
              const link = ref.sourceUrl
                ? ref.sourceUrl
                : `${dustApi.apiUrl()}/${dustApi.workspaceId()}/builder/data-sources/${
                    ref.dataSourceView?.dataSource.id
                  }/upsert?documentId=${encodeURIComponent(ref.documentId)}`;
              if (newDoc) {
                documents.push({
                  documentId: ref.documentId,
                  dataSourceView: ref.dataSourceView,
                  sourceUrl: link,
                  reference: ref.reference,
                  referenceCount: refCounter[k],
                });
              }
              const icon =
                (ref.dataSourceView?.dataSource.connectorProvider &&
                  ConnectorProviders[ref.dataSourceView.dataSource.connectorProvider]?.icon) ??
                undefined;
              const markdownIcon = icon ? `<img src="${icon}" width="16" height="16"> ` : "";
              return `[${markdownIcon}[${refCounter[k]}](${link})]`;
            }
            return "";
          })
          .join("");
      });
      setDustDocuments(documents);
      return contentWithLinks;
    }
    return removeCiteMention(content);
  }

  const r = await dustApi.createConversation({
    title: null,
    visibility: "unlisted",
    message: {
      content: question,
      mentions: [
        {
          configurationId: agent.sId,
        },
      ],
      context,
    },
  });

  if (r.isErr()) {
    const error = r.error.message;
    showToast({
      style: Toast.Style.Failure,
      title: error || "Dust API error",
    });
    setDustAnswer("**Dust API error**");
  } else {
    const { conversation, message } = r.value;
    setConversationTitle(conversation.title ?? `Ask @${agent.name}`);

    if (!conversation || !message) {
      showToast({
        style: Toast.Style.Failure,
        title: "Dust API error: conversation or message is missing",
      });
      setDustAnswer("**Dust API error** (conversation or message is missing)");
    } else {
      setConversationId(conversation.sId);

      // Find the agent message sId from conversation content
      const agentMessage = conversation.content
        .map((versions) => versions[versions.length - 1])
        .find((m) => m && m.type === "agent_message" && m.parentMessageId === message.sId);

      if (!agentMessage) {
        showToast({ style: Toast.Style.Failure, title: "Failed to retrieve agent message" });
        setDustAnswer("**Dust API error** (no agent message found)");
        return;
      }

      try {
        // Stream SSE events directly using undici fetch + Node.js async iterable,
        // bypassing the Dust client's streamAgentAnswerEvents which uses
        // ReadableStream.getReader() — incompatible with undici in Raycast's environment.
        const headers = await dustApi.baseHeaders();
        headers["Content-Type"] = "application/json";
        headers["Accept"] = "text/event-stream";

        const eventsUrl = `${dustApi.apiUrl()}/api/v1/w/${dustApi.workspaceId()}/assistant/conversations/${conversation.sId}/messages/${agentMessage.sId}/events`;

        const res = await undiciFetch(eventsUrl, {
          method: "GET",
          headers,
          signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`Events request failed: status=${res.status}`);
        }

        let answer = "";
        let action: AgentActionPublicType | undefined = undefined;
        const chainOfThought: {
          tokens: string;
          timestamp: number;
        }[] = [];

        showToast({
          style: Toast.Style.Animated,
          title: "Thinking...",
        });

        let streamError = false;
        const processEvent = (eventData: Record<string, unknown>) => {
          const event = eventData.data as Record<string, unknown> | undefined;
          if (!event || !event.type) return;

          switch (event.type) {
            case "user_message_error": {
              const error = event.error as { code: string; message: string };
              console.error(`User message error: code: ${error.code} message: ${error.message}`);
              setDustAnswer(`**User message error** ${error.message}`);
              streamError = true;
              break;
            }
            case "agent_error": {
              const error = event.error as { code: string; message: string };
              console.error(`Agent message error: code: ${error.code} message: ${error.message}`);
              setDustAnswer(`**Dust API error** ${error.message}`);
              streamError = true;
              break;
            }
            case "agent_action_success": {
              action = event.action as AgentActionPublicType;
              break;
            }
            case "generation_tokens": {
              if (event.classification === "tokens") {
                answer = (answer + (event.text as string)).trim();
                const dustAnswer = processAction({ content: answer, action, setDustDocuments });
                setDustAnswer(dustAnswer + "...");
              } else if (event.classification === "chain_of_thought") {
                chainOfThought.push({
                  tokens: event.text as string,
                  timestamp: event.created as number,
                });
                const thinking = chainOfThought.map((c) => c.tokens).join("");
                const recent = thinking.slice(-60);
                showToast({
                  style: Toast.Style.Animated,
                  title: `@${agent.name} is thinking...`,
                  message: recent,
                });
              }
              break;
            }
            case "agent_message_success": {
              const msg = event.message as { content?: string };
              answer = processAction({ content: msg.content ?? "", action, setDustDocuments });
              showToast({
                style: Toast.Style.Success,
                title: `@${agent.name} answered your question`,
                message: question,
              });
              setDustAnswer(answer);
              addDustHistory({
                conversationId: conversation.sId,
                question: question,
                answer: answer,
                date: new Date(),
                agent: agent.name,
              });
              break;
            }
            default:
            // Nothing to do on unsupported events
          }
        };

        const parser = createParser((sseEvent) => {
          if (sseEvent.type === "event" && sseEvent.data) {
            try {
              const parsed = JSON.parse(sseEvent.data);
              processEvent(parsed);
            } catch (err) {
              console.error("Failed parsing SSE event data:", err);
            }
          }
        });

        const decoder = new TextDecoder();
        for await (const chunk of res.body) {
          if (streamError) break;
          parser.feed(decoder.decode(chunk as Buffer, { stream: true }));
        }
      } catch (error) {
        const isAbort =
          (error instanceof DOMException && error.name === "AbortError") ||
          (error instanceof Error && (error.name === "AbortError" || error.message.includes("AbortError")));
        if (isAbort) {
          // Silently ignore — user navigated away or component unmounted
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: "Dust API error",
            message: String(error),
          });
          setDustAnswer(`**Dust API error** ${error}`);
        }
      }
    }
  }
}

export const AskDustQuestion = withPickedWorkspace(
  ({ question, agent = DUST_AGENT }: { question: string; agent?: AgentType }) => {
    const [conversationId, setConversationId] = useState<string | undefined>(undefined);
    const [conversationTitle, setConversationTitle] = useState<string | undefined>(undefined);
    const [dustAnswer, setDustAnswer] = useState<string | undefined>(undefined);
    const [dustDocuments, setDustDocuments] = useState<DustDocument[]>([]);
    const { context, isLoading: isLoadingContext } = useConversationContext();

    const dustApi = getDustClient();

    useEffect(() => {
      if (question && !conversationId && !isLoadingContext && context) {
        const abortController = new AbortController();
        answerQuestion({
          question,
          context,
          dustApi,
          agent,
          setDustAnswer,
          setConversationId,
          setConversationTitle,
          setDustDocuments,
          signal: abortController.signal,
        });
        return () => {
          abortController.abort();
        };
      }
      // Note: context is intentionally omitted — it's a new object reference on every render
      // and is guaranteed to be non-null when isLoadingContext is false.
    }, [question, isLoadingContext]);

    const dustAssistantUrl = `${dustApi.apiUrl()}/w/${dustApi.workspaceId()}/assistant`;

    return (
      <Detail
        markdown={
          dustAnswer ||
          `\`@${agent.name}\` is thinking about your question:\n\n${question
            .split("\n")
            .map((line) => `> ${line}`)
            .join("\n")}`
        }
        navigationTitle={conversationTitle || "Ask Dust"}
        isLoading={!dustAnswer}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Continue on Dust"
              url={`${dustAssistantUrl}/${conversationId ?? "new"}`}
              icon={Icon.Globe}
            />
            {dustAnswer && (
              <>
                <Action.Paste content={dustAnswer} shortcut={{ modifiers: ["cmd"], key: "return" }} />
                <Action.CopyToClipboard content={dustAnswer} shortcut={{ modifiers: ["cmd"], key: "." }} />
                <Action.Push
                  title="Edit Question"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  target={<AskAgentQuestionForm agent={agent} initialQuestion={question} />}
                />
              </>
            )}
            {dustDocuments && dustDocuments.length > 0 && (
              <Action.Push
                title="Source Urls"
                icon={Icon.BulletPoints}
                shortcut={{ modifiers: ["cmd"], key: "u" }}
                target={<DocumentsList documents={dustDocuments} />}
              />
            )}
          </ActionPanel>
        }
      />
    );
  },
);

function DocumentsList({ documents }: { documents: DustDocument[] }) {
  return (
    <List>
      {documents
        .sort((a, b) => {
          return a.referenceCount - b.referenceCount;
        })
        .map((document) => (
          <List.Item
            key={document.documentId}
            title={`${document.referenceCount} - ${document.sourceUrl}`}
            icon={{
              source:
                (document.dataSourceView?.dataSource.connectorProvider &&
                  ConnectorProviders[document.dataSourceView?.dataSource.connectorProvider]?.icon) ??
                Icon.Globe,
            }}
            accessories={[
              {
                tag: {
                  color:
                    (document.dataSourceView?.dataSource.connectorProvider &&
                      ConnectorProviders[document.dataSourceView.dataSource.connectorProvider]?.color) ??
                    Color.SecondaryText,
                  value:
                    (document.dataSourceView?.dataSource.connectorProvider &&
                      ConnectorProviders[document.dataSourceView.dataSource.connectorProvider]?.name) ??
                    "Unknown",
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Browser" url={document.sourceUrl || ""} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
