import { Action, ActionPanel, Color, Detail, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { DustApi, DustAPICredentials, DustDocument } from "./dust_api/api";
import { useEffect, useState } from "react";
import { addDustHistory } from "./history";
import { AgentType } from "./dust_api/agent";
import { DUST_AGENT } from "./agents";

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
              <Action.Paste content={dustAnswer} shortcut={{ modifiers: ["cmd"], key: ";" }} />
              <Action.CopyToClipboard content={dustAnswer} shortcut={{ modifiers: ["cmd"], key: "." }} />
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

const colors = [Color.Blue, Color.Red, Color.Green, Color.Yellow, Color.Purple, Color.Orange];
function DocumentsList({ documents }: { documents: DustDocument[] }) {
  const sourceIdColors: { [id: string]: Color } = {};
  let index = 0;
  documents.forEach((document) => {
    if (!sourceIdColors[document.dataSourceId]) {
      sourceIdColors[document.dataSourceId] = colors[index % colors.length];
      index++;
    }
  });
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
            accessories={[{ tag: { color: sourceIdColors[document.dataSourceId], value: document.dataSourceId } }]}
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
