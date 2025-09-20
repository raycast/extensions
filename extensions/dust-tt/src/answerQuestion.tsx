import { Action, ActionPanel, Color, Detail, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { addDustHistory } from "./history";
import { ConnectorProviders, DUST_AGENT, AgentType, getUser } from "./utils";
import { AskAgentQuestionForm } from "./askAgent";
import { getDustClient, withPickedWorkspace } from "./dust_api/oauth";
import { AgentActionPublicType, DataSourceViewType, DustAPI, isRetrievalActionType } from "@dust-tt/client";
import { usePromise } from "@raycast/utils";

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
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const isOauth = preferences.connexionFlow === "oauth";

  const formatUsername = useCallback((email: string) => {
    return email
      .split("@")[0]
      .split(".")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }, []);

  const { data: user, isLoading } = usePromise(
    async (isOauth) => {
      if (isOauth) {
        return await getUser();
      }
      return undefined;
    },
    [isOauth],
  );

  let context: ConversationContext | undefined = undefined;

  if (isOauth) {
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
  } else {
    context = {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      username: formatUsername(preferences.userEmail || "Raycast"),
      email: preferences.userEmail ?? null,
      fullName: formatUsername(preferences.userEmail || "Raycast"),
      profilePictureUrl: "https://dust.tt/static/systemavatar/helper_avatar_full.png",
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
    action,
    setDustDocuments,
  }: {
    content: string;
    action?: AgentActionPublicType;
    setDustDocuments: (documents: DustDocument[]) => void;
  }): string {
    const referencedDocuments: Map<string, DustDocument> = new Map();
    if (action && isRetrievalActionType(action) && action.documents) {
      action.documents.forEach((d) => {
        referencedDocuments.set(d.reference, { ...d, referenceCount: 0 });
      });
    }
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
      try {
        const r = await dustApi.streamAgentAnswerEvents({ conversation, userMessageId: message.sId, signal });
        if (r.isErr()) {
          throw new Error(r.error.message);
        } else {
          const { eventStream } = r.value;

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

          for await (const event of eventStream) {
            if (!event) {
              continue;
            }
            switch (event.type) {
              case "user_message_error": {
                console.error(`User message error: code: ${event.error.code} message: ${event.error.message}`);
                setDustAnswer(`**User message error** ${event.error.message}`);
                return;
              }
              case "agent_error": {
                console.error(`Agent message error: code: ${event.error.code} message: ${event.error.message}`);
                setDustAnswer(`**Dust API error** ${event.error.message}`);
                return;
              }
              case "agent_action_success": {
                action = event.action;
                break;
              }

              case "generation_tokens": {
                if (event.classification === "tokens") {
                  answer = (answer + event.text).trim();
                  const dustAnswer = processAction({ content: answer, action, setDustDocuments });
                  setDustAnswer(dustAnswer + "...");
                } else if (event.classification === "chain_of_thought") {
                  chainOfThought.push({ tokens: event.text, timestamp: event.created });

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
                answer = processAction({ content: event.message.content ?? "", action, setDustDocuments });
                showToast({
                  style: Toast.Style.Success,
                  title: `@${agent.name} answered your question`,
                  message: question,
                });
                setDustAnswer(answer);
                await addDustHistory({
                  conversationId: conversation.sId,
                  question: question,
                  answer: answer,
                  date: new Date(),
                  agent: agent.name,
                });
                return;
              }
              default:
              // Nothing to do on unsupported events
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes("AbortError")) {
          showToast({
            style: Toast.Style.Failure,
            title: "Request was aborted",
          });
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
    const [abortController] = useState(new AbortController());
    const { context, isLoading: isLoadingContext } = useConversationContext();

    const dustApi = getDustClient();

    useEffect(() => {
      if (question && !conversationId && !isLoadingContext && context) {
        const asyncAnswer = async () => {
          await answerQuestion({
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
        };

        asyncAnswer();
      }
    }, [question, conversationId, isLoadingContext]);

    useEffect(() => {
      return () => {
        try {
          abortController.abort();
        } catch (e) {
          /* empty */
        }
      };
    }, []);

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
                  ConnectorProviders[document.dataSourceView?.dataSource.connectorProvider].icon) ??
                Icon.Globe,
            }}
            accessories={[
              {
                tag: {
                  color:
                    (document.dataSourceView?.dataSource.connectorProvider &&
                      ConnectorProviders[document.dataSourceView.dataSource.connectorProvider].color) ??
                    Color.SecondaryText,
                  value:
                    (document.dataSourceView?.dataSource.connectorProvider &&
                      ConnectorProviders[document.dataSourceView.dataSource.connectorProvider].name) ??
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
