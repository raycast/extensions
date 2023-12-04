import { Action, ActionPanel, Detail, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import { DustApi, DustAPICredentials } from "./dust_api/api";
import { useEffect, useState } from "react";
import { addDustHistory } from "./history";
import { AgentType } from "./dust_api/agent";
import { DUST_AGENT } from "./agents";

async function answerQuestion({
  question,
  dustApi,
  setDustAnswer,
  setConversationId,
  agent = DUST_AGENT,
}: {
  question: string;
  dustApi: DustApi;
  setDustAnswer: (answer: string) => void;
  setConversationId: (conversationId: string) => void;
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
    });
  }
}

export function AskDustQuestion({ question, agent = DUST_AGENT }: { question: string; agent?: AgentType }) {
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [dustAnswer, setDustAnswer] = useState<string | undefined>(undefined);

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
        </ActionPanel>
      }
    />
  );
}
