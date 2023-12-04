import {
  Action,
  ActionPanel,
  Form,
  getSelectedText,
  Icon,
  LaunchType,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useAgents } from "./agents";
import AskDustCommand from "./ask";
import { AgentType } from "./dust_api/agent";
import { useForm } from "@raycast/utils";
import { useEffect, useState } from "react";

interface AskAgentQuestionFormValues {
  question: string;
}

export function useGetSelectedText() {
  const [selectedText, setSelectedText] = useState<string | undefined>(undefined);
  useEffect(() => {
    async function fetchHighlightedText() {
      let text: string | undefined;
      try {
        text = await getSelectedText();
      } catch (error) {
        console.debug("Could not get selected text", error);
        setSelectedText("");
      }
      if (text) {
        await showToast(Toast.Style.Success, "Used highlighted text as question.");
        setSelectedText(text);
      }
    }
    fetchHighlightedText();
  }, []);
  return selectedText;
}

export function AskAgentQuestionForm({ agent, initialQuestion }: { agent: AgentType; initialQuestion?: string }) {
  const { push } = useNavigation();
  const { handleSubmit, itemProps, setValue } = useForm<AskAgentQuestionFormValues>({
    onSubmit(values) {
      push(
        <AskDustCommand launchType={LaunchType.UserInitiated} arguments={{ agent: agent, search: values.question }} />,
      );
    },
    validation: {
      question: (value) => {
        if (!value) {
          return "Ask a question";
        }
      },
    },
  });

  useEffect(() => {
    if (!initialQuestion) {
      return;
    }
    setValue("question", initialQuestion);
  }, [initialQuestion]);
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask" shortcut={{ key: "return", modifiers: [] }} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Agent" text={agent.name} />
      <Form.Description text={agent.description} />
      <Form.TextArea title="Question" enableMarkdown {...itemProps.question} />
    </Form>
  );
}

export default function AskDustAgentCommand() {
  const { agents, isLoading, error } = useAgents();
  const selectedText = useGetSelectedText();
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
                {selectedText && (
                  <Action.Push
                    title="Ask with the Selected Text"
                    icon={Icon.Message}
                    shortcut={{ key: "return", modifiers: ["cmd"] }}
                    target={
                      <AskDustCommand
                        launchType={LaunchType.UserInitiated}
                        arguments={{ agent: agent, search: selectedText }}
                      />
                    }
                  />
                )}
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
