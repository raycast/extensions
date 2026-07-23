import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Form,
  Icon,
  List,
  Toast,
  closeMainWindow,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { agentIcon } from "../lib/agent-appearance";
import { addPromptHistory, clearPromptHistory, getPromptHistory } from "../lib/prompt-history";
import { getAgentTarget, sendAgentPrompt } from "../lib/herdr";
import { getHerdrPreferences } from "../lib/preferences";
import type { AgentInfo, PromptHistoryItem } from "../lib/types";
import { runAction, statusTitle } from "../lib/ui";

interface PromptAgentFormProps {
  agents: AgentInfo[];
  initialAgentId?: string;
  initialPrompt?: string;
  onSent?: () => void | Promise<void>;
}

function PromptHistory({ onUse }: { onUse: (text: string) => void }) {
  const [history, setHistory] = useState<PromptHistoryItem[]>([]);
  const { pop } = useNavigation();

  useEffect(() => {
    void getPromptHistory().then(setHistory);
  }, []);

  return (
    <List searchBarPlaceholder="Search previous prompts…">
      <List.EmptyView
        icon={Icon.Clock}
        title="No Prompt History"
        description="Prompts you send from Raycast will appear here."
      />
      {history.map((item) => (
        <List.Item
          key={item.id}
          icon={agentIcon(item.kind || item.agent)}
          title={item.text.split("\n")[0] || "Prompt"}
          subtitle={item.agent}
          accessories={[{ date: new Date(item.createdAt) }]}
          keywords={[item.text, item.target, item.agent]}
          actions={
            <ActionPanel>
              <Action
                title="Use Prompt"
                icon={Icon.ArrowLeft}
                onAction={() => {
                  onUse(item.text);
                  pop();
                }}
              />
              <Action.CopyToClipboard
                title="Copy Prompt"
                content={item.text}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action
                title="Clear Prompt History"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={async () => {
                  if (
                    await confirmAlert({
                      title: "Clear Prompt History?",
                      message: "This removes all prompts saved by the Herdr extension.",
                      primaryAction: { title: "Clear History", style: Alert.ActionStyle.Destructive },
                    })
                  ) {
                    await clearPromptHistory();
                    setHistory([]);
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export function PromptAgentForm({ agents, initialAgentId, initialPrompt = "", onSent }: PromptAgentFormProps) {
  const initial = useMemo(
    () => agents.find((agent) => agent.pane_id === initialAgentId)?.pane_id || agents[0]?.pane_id || "",
    [agents, initialAgentId],
  );
  const [targetPane, setTargetPane] = useState(initial);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [error, setError] = useState<string>();
  const { pop } = useNavigation();

  async function submit() {
    const text = prompt.trim();
    if (!text) {
      setError("Enter a prompt to send.");
      return;
    }
    const agent = agents.find((candidate) => candidate.pane_id === targetPane);
    if (!agent) {
      await showToast({ style: Toast.Style.Failure, title: "Choose a live agent" });
      return;
    }
    const target = getAgentTarget(agent);
    const sent = await runAction(
      `Prompting ${agent.name || agent.display_agent || agent.agent}`,
      async () => {
        await sendAgentPrompt(target, text);
        await addPromptHistory(agent, target, text);
      },
      { success: "Prompt Sent", onSuccess: onSent },
    );
    if (!sent) return;

    if (getHerdrPreferences().closeAfterPrompt !== false) {
      await closeMainWindow({ clearRootSearch: true });
    } else {
      pop();
    }
  }

  if (agents.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Person}
          title="No Live Agents"
          description="Start an agent in Herdr, or use the Start Agent command."
        />
      </List>
    );
  }

  return (
    <Form
      navigationTitle="Prompt Agent"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Prompt" icon={Icon.Message} onSubmit={submit} />
          <Action.Push
            title="Use Previous Prompt"
            icon={Icon.Clock}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            target={
              <PromptHistory
                onUse={(text) => {
                  setPrompt(text);
                  setError(undefined);
                }}
              />
            }
          />
          <Action
            title="Paste Clipboard"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            onAction={async () => {
              const text = await Clipboard.readText();
              if (text) setPrompt(text);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="agent" title="Agent" value={targetPane} onChange={setTargetPane}>
        {agents.map((agent) => (
          <Form.Dropdown.Item
            key={agent.pane_id}
            value={agent.pane_id}
            title={`${agent.name || agent.display_agent || agent.agent} — ${statusTitle(agent.agent_status)}`}
            icon={agentIcon(agent.agent || agent.display_agent)}
          />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="What should the agent do?"
        value={prompt}
        onChange={(value) => {
          setPrompt(value);
          setError(undefined);
        }}
        error={error}
        enableMarkdown
        autoFocus
      />
      <Form.Description text="⌘↵ sends · ⌘⇧P opens history · ⌘⇧V pastes the clipboard" />
    </Form>
  );
}
