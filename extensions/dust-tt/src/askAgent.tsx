import { Action, ActionPanel, Form, Icon, LaunchType, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useAgents } from "./agents";
import AskDustCommand from "./ask";
import { AgentType } from "./dust_api/agent";
import { useState } from "react";

export function AskAgentQuestionForm({ agent }: { agent: AgentType }) {
  const { push } = useNavigation();
  const [questionError, setQuestionError] = useState<string | undefined>(undefined);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Ask"
            shortcut={{ key: "return", modifiers: [] }}
            onSubmit={(values) => {
              push(
                <AskDustCommand
                  launchType={LaunchType.UserInitiated}
                  arguments={{ agent: agent, search: values.question }}
                />,
              );
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Agent" text={agent.name} />
      <Form.Description text={agent.description} />
      <Form.TextArea
        id="question"
        title="Question"
        enableMarkdown
        error={questionError}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setQuestionError("You must ask a question");
          } else {
            setQuestionError(undefined);
          }
        }}
      />
    </Form>
  );
}

export default function AskDustAgentCommand() {
  const { agents, isLoading, error } = useAgents();

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: `Could not refresh agents list: ${error}`,
    });
  }
  if (!isLoading && agents) {
    showToast({
      style: Toast.Style.Success,
      title: `Loaded ${Object.values(agents).length} agents`,
    });
  }
  return (
    <List isLoading={isLoading}>
      {agents ? (
        Object.values(agents).map((agent) => (
          <List.Item
            key={agent.sId}
            title={agent.name}
            subtitle={agent.description}
            icon={agent.pictureUrl}
            accessories={[{ icon: Icon.ArrowRight }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Ask"
                  icon={Icon.Message}
                  shortcut={{ key: "return", modifiers: [] }}
                  target={<AskAgentQuestionForm agent={agent} />}
                />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView icon={Icon.XMarkCircle} title="No Dust agents loaded" />
      )}
    </List>
  );
}
