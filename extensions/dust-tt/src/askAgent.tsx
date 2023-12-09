import {
  Action,
  ActionPanel,
  Form,
  getSelectedText,
  Icon,
  LaunchType,
  List,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useAgents } from "./agents";
import AskDustCommand from "./ask";
import { AgentConfigurationType, AgentType } from "./dust_api/agent";
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

const QUICK_AGENT_KEY = "dust_favorite_agent";

interface AgentConfigurationWithFavorite extends AgentConfigurationType {
  isFavorite?: boolean;
}

export default function AskDustAgentCommand() {
  const { agents, isLoading, error } = useAgents();
  const [favoriteAgent, setFavoriteAgent] = useState<AgentConfigurationWithFavorite | undefined>(undefined);
  const [isLoadingFavorite, setIsLoadingFavorite] = useState(true);
  const selectedText = useGetSelectedText();

  useEffect(() => {
    async function fetchFavoriteAgent() {
      if (!isLoadingFavorite) {
        return;
      }
      const favoriteAgentString = await LocalStorage.getItem<string>("dust_favorite_agent");
      setFavoriteAgent(favoriteAgentString ? JSON.parse(favoriteAgentString) : undefined);
      setIsLoadingFavorite(false);
    }
    fetchFavoriteAgent();
  }, [isLoadingFavorite]);

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

  const agentsList: AgentConfigurationWithFavorite[] | undefined =
    agents && favoriteAgent
      ? [favoriteAgent, ...Object.values(agents).filter((agent) => agent.sId !== favoriteAgent.sId)]
      : agents
        ? Object.values(agents)
        : undefined;
  return (
    <List isLoading={isLoading && isLoadingFavorite}>
      {!isLoadingFavorite && agentsList ? (
        agentsList.map((agent) => (
          <List.Item
            key={agent.sId}
            title={agent.name}
            subtitle={agent.description}
            icon={agent.pictureUrl}
            accessories={[
              { icon: agent.isFavorite ? Icon.Bolt : null },
              { tag: agent.scope },
              { icon: Icon.ArrowRight },
            ]}
            actions={
              <ActionPanel>
                {selectedText ? (
                  <>
                    <Action.Push
                      title="Ask For Selected Text"
                      icon={Icon.Message}
                      shortcut={{ key: "return", modifiers: [] }}
                      target={
                        <AskDustCommand
                          launchType={LaunchType.UserInitiated}
                          arguments={{ agent: agent, search: selectedText }}
                        />
                      }
                    />
                    <Action.Push
                      title="Edit Question Before Asking"
                      icon={Icon.Highlight}
                      shortcut={{ key: "return", modifiers: ["cmd"] }}
                      target={<AskAgentQuestionForm agent={agent} initialQuestion={selectedText} />}
                    />
                  </>
                ) : (
                  <Action.Push
                    title="Ask"
                    icon={Icon.Highlight}
                    shortcut={{ key: "return", modifiers: [] }}
                    target={<AskAgentQuestionForm agent={agent} />}
                  />
                )}
                {!agent.isFavorite && (
                  <Action
                    title="Quick Agent"
                    icon={Icon.Bolt}
                    onAction={async () => {
                      showToast({
                        style: Toast.Style.Success,
                        title: `${agent.name} added as favorite`,
                      });
                      agent.isFavorite = true;
                      await LocalStorage.setItem(QUICK_AGENT_KEY, JSON.stringify(agent));
                      setIsLoadingFavorite(true);
                    }}
                    shortcut={{ key: "f", modifiers: ["cmd", "shift"] }}
                  />
                )}
                {agent.isFavorite && (
                  <Action
                    title="Remove Quick Agent"
                    icon={Icon.BoltDisabled}
                    onAction={async () => {
                      showToast({
                        style: Toast.Style.Success,
                        title: `${agent.name} removed as favorite`,
                      });
                      agent.isFavorite = false;
                      await LocalStorage.removeItem(QUICK_AGENT_KEY);
                      setIsLoadingFavorite(true);
                    }}
                    style={Action.Style.Destructive}
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
