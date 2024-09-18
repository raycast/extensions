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
import { AgentConfigurationScope, AgentConfigurationType, AgentType } from "./dust_api/agent";
import { useForm } from "@raycast/utils";
import { useEffect, useState } from "react";

interface AskAgentQuestionFormValues {
  question: string;
}

export function useGetSelectedText() {
  const [selectedText, setSelectedText] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
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
      setIsLoading(false);
    }
    fetchHighlightedText();
  }, []);
  return { selectedText: selectedText, isLoading: isLoading };
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

export default function AskDustAgentCommand() {
  const { agents, error, isLoading: isLoadingAgents } = useAgents();
  const [favoriteAgentId, setFavoriteAgentId] = useState<string | undefined>(undefined);
  const [isLoadingFavorite, setIsLoadingFavorite] = useState(true);
  const { selectedText, isLoading: isLoadingSelectedText } = useGetSelectedText();

  useEffect(() => {
    async function fetchFavoriteAgent() {
      if (!isLoadingFavorite) {
        return;
      }
      const favoriteAgentString = await LocalStorage.getItem<string>("dust_favorite_agent");
      const favoriteAgent = favoriteAgentString ? JSON.parse(favoriteAgentString) : undefined;
      setFavoriteAgentId(favoriteAgent?.sId);
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
  if (!isLoadingAgents && agents) {
    showToast({
      style: Toast.Style.Success,
      title: `Loaded ${Object.values(agents).length} agents`,
    });
  }

  function sort(a: AgentConfigurationType, b: AgentConfigurationType) {
    if (a.name < b.name) {
      return -1;
    }
    if (a.name > b.name) {
      return 1;
    }
    return 0;
  }

  async function saveFavoriteAgent(agent: AgentConfigurationType) {
    setFavoriteAgentId(agent.sId);
    await LocalStorage.setItem(QUICK_AGENT_KEY, JSON.stringify(agent));
    setIsLoadingFavorite(true);
    showToast({
      style: Toast.Style.Success,
      title: `${agent.name} added as favorite`,
    });
  }

  async function removeFavoriteAgent(agent: AgentConfigurationType) {
    setFavoriteAgentId(undefined);
    await LocalStorage.removeItem(QUICK_AGENT_KEY);
    setIsLoadingFavorite(true);
    showToast({
      style: Toast.Style.Success,
      title: `${agent.name} removed as favorite`,
    });
  }

  const allAgents: AgentConfigurationType[] | undefined = agents ? Object.values(agents) : undefined;
  const agentsSections = allAgents ? allAgents.map((agent) => agent.scope) : undefined;
  const allSections = agentsSections
    ? ["global", "workspace", "published", "private"].filter((section) => {
        return agentsSections?.includes(section as AgentConfigurationScope);
      })
    : undefined;

  const isLoading = isLoadingAgents || isLoadingSelectedText || isLoadingFavorite;
  return (
    <List isLoading={isLoading}>
      {(!agents || isLoading) && <List.EmptyView icon={Icon.XMarkCircle} title="No Dust agents loaded" />}
      {agents && favoriteAgentId && (
        <AgentListItem
          agent={agents[favoriteAgentId]}
          isFavorite={true}
          selectedText={selectedText}
          onSaveFavorite={saveFavoriteAgent}
          onRemoveFavorite={removeFavoriteAgent}
        />
      )}
      {!isLoadingFavorite &&
        agents &&
        allSections?.map((section) => {
          const agentsInSection = allAgents?.filter((agent) => agent.scope === section).sort(sort);
          return (
            <List.Section title={section} key={section}>
              {agentsInSection?.map((agent) => {
                return (
                  <AgentListItem
                    agent={agent}
                    isFavorite={agent.sId === favoriteAgentId}
                    selectedText={selectedText}
                    onSaveFavorite={saveFavoriteAgent}
                    onRemoveFavorite={removeFavoriteAgent}
                    key={agent.sId}
                  />
                );
              })}
            </List.Section>
          );
        })}
    </List>
  );
}

function AgentListItem({
  agent,
  isFavorite,
  selectedText,
  onSaveFavorite,
  onRemoveFavorite,
}: {
  agent: AgentConfigurationType;
  isFavorite: boolean;
  selectedText: string | undefined;
  onSaveFavorite: (agent: AgentConfigurationType) => Promise<void>;
  onRemoveFavorite: (agent: AgentConfigurationType) => Promise<void>;
}) {
  if (!agent) {
    return null;
  }
  return (
    <List.Item
      key={agent.sId}
      title={agent.name}
      subtitle={agent.description}
      icon={agent.pictureUrl}
      accessories={[{ icon: isFavorite ? Icon.Bolt : null }, { tag: agent.scope }, { icon: Icon.ArrowRight }]}
      actions={
        <ActionPanel>
          {selectedText ? (
            <>
              <Action.Push
                title="Ask for Selected Text"
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
          {!isFavorite && (
            <Action
              title="Quick Agent"
              icon={Icon.Bolt}
              onAction={async () => await onSaveFavorite(agent)}
              shortcut={{ key: "f", modifiers: ["cmd", "shift"] }}
            />
          )}
          {isFavorite && (
            <Action
              title="Remove Quick Agent"
              icon={Icon.BoltDisabled}
              onAction={async () => {
                await onRemoveFavorite(agent);
              }}
              style={Action.Style.Destructive}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
