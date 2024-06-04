import { Action, ActionPanel, Color, Detail, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { DustApi, DustAPICredentials } from "./dust_api/api";
import { useEffect, useState } from "react";
import { addDustHistory } from "./history";
import { AgentType } from "./dust_api/agent";
import { DUST_AGENT, MANAGED_SOURCES } from "./agents";
import { DustDocument } from "./dust_api/conversation_events";
import { AskAgentQuestionForm } from "./askAgent";

async function answerQuestion({
  question,
  dustApi,
  setDustAnswer,
  setConversationId,
  setDustDocuments,
  agent = DUST_AGENT,
}: {
  question: string;
  dustApi: DustApi;
  setDustAnswer: (answer: string) => void;
  setConversationId: (conversationId: string) => void;
  setDustDocuments: (documents: DustDocument[]) => void;
  agent?: AgentType;
}) {
  const { conversation, message, error } = await dustApi.createConversation({ question: question, agentId: agent.sId });
  if (error || !conversation || !message) {
    showToast({
      style: Toast.Style.Failure,
      title: error || "Dust API error",
    });
    setDustAnswer("**Dust API error**");
  } else {
    setConversationId(conversation.sId);
    try {
      await dustApi.streamAnswer({
        conversation: conversation,
        message: message,
        setDustAnswer: setDustAnswer,
        onDone: async (answer) => {
          await addDustHistory({
            conversationId: conversation.sId,
            question: question,
            answer: answer,
            date: new Date(),
            agent: agent.name,
          });
        },
        setDustDocuments,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Dust API error",
        message: String(error),
      });
      setDustAnswer("**Dust API error**");
    }
  }
}

export function AskDustQuestion({ question, agent = DUST_AGENT }: { question: string; agent?: AgentType }) {
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [dustAnswer, setDustAnswer] = useState<string | undefined>(undefined);
  const [dustDocuments, setDustDocuments] = useState<DustDocument[]>([]);
  const preferences = getPreferenceValues<DustAPICredentials>();
  const dustApi = new DustApi(preferences);

  useEffect(() => {
    if (question) {
      (async () => {
        await answerQuestion({
          question: question,
          dustApi: dustApi,
          agent: agent,
          setDustAnswer: setDustAnswer,
          setConversationId: setConversationId,
          setDustDocuments: setDustDocuments,
        });
      })();
    }
  }, [question]);

  const dustAssistantUrl = `https://dust.tt/w/${preferences.workspaceId}/assistant`;

  return (
    <Detail
      markdown={dustAnswer || `Dust agent \`${agent.name}\` is thinking about your question:\n\n > ${question}`}
      navigationTitle={question || "Ask Dust"}
      isLoading={!dustAnswer}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Continue On Dust"
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
}

function DocumentsList({ documents }: { documents: DustDocument[] }) {
  return (
    <List>
      {documents
        .sort((a, b) => {
          return a.reference - b.reference;
        })
        .map((document) => (
          <List.Item
            key={document.id}
            title={`${document.reference} - ${document.sourceUrl}`}
            icon={
              document.dataSourceId in MANAGED_SOURCES
                ? { source: MANAGED_SOURCES[document.dataSourceId].icon }
                : { source: Icon.Globe }
            }
            accessories={[
              {
                tag: {
                  color:
                    document.dataSourceId in MANAGED_SOURCES
                      ? MANAGED_SOURCES[document.dataSourceId].color
                      : Color.SecondaryText,
                  value:
                    document.dataSourceId in MANAGED_SOURCES
                      ? MANAGED_SOURCES[document.dataSourceId].name
                      : document.dataSourceId,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Browser" url={document.sourceUrl} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
