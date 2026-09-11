import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import path from "path";
import os from "os";
import { existsSync } from "fs";
import {
  ClaudeAgentSession,
  DispatchAgentOptions,
  buildAgentActionArgs,
  getAgentSection,
  LatestRequestGuard,
} from "./lib/agent-control-core";
import {
  dispatchAgent,
  listAgentSessions,
  runAgentAction,
} from "./lib/agent-control";
import { launchClaudeCommand } from "./lib/terminal";

type AgentFilter = "active" | "all";

const SECTION_ORDER = [
  "needs-input",
  "working",
  "completed",
  "failed",
  "foreground",
  "unknown",
] as const;

const SECTION_TITLE: Record<(typeof SECTION_ORDER)[number], string> = {
  "needs-input": "Needs Input",
  working: "Working",
  completed: "Completed",
  failed: "Failed or Stopped",
  foreground: "Foreground Sessions",
  unknown: "Unknown State",
};

export default function ManageAgents() {
  const [filter, setFilter] = useState<AgentFilter>("active");
  const [agents, setAgents] = useState<ClaudeAgentSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const requestGuard = useRef(new LatestRequestGuard());
  const { push } = useNavigation();

  const loadAgents = useCallback(async () => {
    const request = requestGuard.current.begin();
    setIsLoading(true);
    try {
      const nextAgents = await listAgentSessions(filter === "all");
      if (!requestGuard.current.isCurrent(request)) return;
      setAgents(nextAgents);
      setError(undefined);
    } catch (loadError) {
      if (!requestGuard.current.isCurrent(request)) return;
      setAgents([]);
      setError(
        loadError instanceof Error ? loadError.message : String(loadError),
      );
    } finally {
      if (requestGuard.current.isCurrent(request)) setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadAgents();
    return () => {
      requestGuard.current.begin();
    };
  }, [loadAgents]);

  const groupedAgents = useMemo(() => {
    return Object.fromEntries(
      SECTION_ORDER.map((section) => [
        section,
        agents.filter((agent) => getAgentSection(agent) === section),
      ]),
    ) as Record<(typeof SECTION_ORDER)[number], ClaudeAgentSession[]>;
  }, [agents]);

  const openDispatchForm = (projectPath?: string) =>
    push(
      <DispatchAgentForm
        initialProjectPath={projectPath}
        onDispatched={loadAgents}
      />,
    );

  const commonActions = (
    <>
      <Action
        title="Refresh Agents"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={loadAgents}
      />
      <Action
        title="Dispatch Agent"
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        onAction={() => openDispatchForm()}
      />
      <Action
        title="Open Native Agent View"
        icon={Icon.Terminal}
        onAction={() => launchClaudeCommand(["agents"], os.homedir())}
      />
    </>
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search agents by name or project..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Agent History"
          value={filter}
          onChange={(value) => setFilter(value as AgentFilter)}
        >
          <List.Dropdown.Item title="Active Agents" value="active" />
          <List.Dropdown.Item title="All Agents" value="all" />
        </List.Dropdown>
      }
    >
      {SECTION_ORDER.map((section) => {
        const sectionAgents = groupedAgents[section];
        if (sectionAgents.length === 0) return null;
        return (
          <List.Section
            key={section}
            title={SECTION_TITLE[section]}
            subtitle={`${sectionAgents.length}`}
          >
            {sectionAgents.map((agent) => (
              <AgentItem
                key={agent.id || agent.sessionId || `${agent.pid}-${agent.cwd}`}
                agent={agent}
                onRefresh={loadAgents}
                onDispatch={() => openDispatchForm(agent.cwd)}
              />
            ))}
          </List.Section>
        );
      })}

      {!isLoading && agents.length === 0 && (
        <List.EmptyView
          title={error ? "Unable to Load Agents" : "No Agents Found"}
          description={
            error ||
            (filter === "active"
              ? "Dispatch a background agent or switch to All Agents."
              : "Claude Code has no recorded agent sessions.")
          }
          icon={error ? Icon.ExclamationMark : Icon.Person}
          actions={<ActionPanel>{commonActions}</ActionPanel>}
        />
      )}
    </List>
  );
}

function AgentItem({
  agent,
  onRefresh,
  onDispatch,
}: {
  agent: ClaudeAgentSession;
  onRefresh: () => Promise<void>;
  onDispatch: () => void;
}) {
  const section = getAgentSection(agent);
  const title =
    agent.name || agent.id || agent.sessionId || path.basename(agent.cwd);
  const stateLabel = getStateLabel(agent);
  const stateColor = getStateColor(section);
  const canManage = Boolean(agent.id) && agent.kind === "background";

  async function handleAction(
    action: "stop" | "respawn" | "rm",
    successTitle: string,
  ) {
    if (!agent.id) return;
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: `${successTitle}...`,
      });
      const output = await runAgentAction(action, agent.id);
      await onRefresh();
      if (action === "rm" && /\bkept\b/i.test(output)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Agent Kept",
          message: output,
        });
        return;
      }
      await showToast({
        style: Toast.Style.Success,
        title: successTitle,
        message: output || undefined,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Agent Command Failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function confirmAndStop() {
    const confirmed = await confirmAlert({
      title: "Stop Agent",
      message: `Stop ${title}? Its conversation will remain available.`,
      primaryAction: {
        title: "Stop Agent",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (confirmed) await handleAction("stop", "Agent Stopped");
  }

  async function confirmAndRemove() {
    const confirmed = await confirmAlert({
      title: "Remove Agent",
      message:
        "Claude will remove this background session and its worktree. It may refuse if the worktree has changes that need attention.",
      primaryAction: {
        title: "Remove Agent",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (confirmed) await handleAction("rm", "Agent Removed");
  }

  return (
    <List.Item
      title={title}
      subtitle={agent.waitingFor || agent.cwd}
      icon={getStateIcon(section)}
      keywords={[agent.cwd, agent.kind, agent.state, agent.status || ""]}
      accessories={[
        { tag: { value: stateLabel, color: stateColor } },
        { text: formatAge(agent.startedAt) },
      ]}
      actions={
        <ActionPanel>
          {canManage && agent.id && (
            <ActionPanel.Section title="Agent">
              <Action
                title="Attach in Terminal"
                icon={Icon.Terminal}
                onAction={() =>
                  launchClaudeCommand(
                    buildAgentActionArgs("attach", agent.id!),
                    agent.cwd,
                  )
                }
              />
              <Action.Push
                title="View Recent Logs"
                icon={Icon.TextDocument}
                target={<AgentLogs agent={agent} />}
              />
              {(section === "working" || section === "needs-input") && (
                <Action
                  title="Stop Agent"
                  icon={Icon.Stop}
                  style={Action.Style.Destructive}
                  onAction={confirmAndStop}
                />
              )}
              {(section === "failed" || section === "completed") && (
                <Action
                  title="Restart Agent"
                  icon={Icon.ArrowClockwise}
                  onAction={() => handleAction("respawn", "Agent Restarted")}
                />
              )}
            </ActionPanel.Section>
          )}

          <ActionPanel.Section title="Project">
            <Action
              title="Open Native Agent View"
              icon={Icon.Terminal}
              onAction={() => launchClaudeCommand(["agents"], agent.cwd)}
            />
            {existsSync(agent.cwd) && <Action.ShowInFinder path={agent.cwd} />}
            {existsSync(agent.cwd) && <Action.OpenWith path={agent.cwd} />}
            <Action.CopyToClipboard
              title="Copy Project Path"
              content={agent.cwd}
              shortcut={Keyboard.Shortcut.Common.CopyPath}
            />
            {agent.id && (
              <Action.CopyToClipboard
                title="Copy Agent Identifier"
                content={agent.id}
              />
            )}
            {agent.sessionId && (
              <Action.CopyToClipboard
                title="Copy Session Identifier"
                content={agent.sessionId}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Manage">
            <Action
              title="Dispatch Agent"
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
              onAction={onDispatch}
            />
            <Action
              title="Refresh Agents"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRefresh}
            />
            {canManage &&
              agent.id &&
              (section === "completed" || section === "failed") && (
                <Action
                  title="Remove Agent"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={confirmAndRemove}
                />
              )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function AgentLogs({ agent }: { agent: ClaudeAgentSession }) {
  const [logs, setLogs] = useState("");
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!agent.id) return;
    runAgentAction("logs", agent.id)
      .then(setLogs)
      .catch((loadError) =>
        setError(
          loadError instanceof Error ? loadError.message : String(loadError),
        ),
      )
      .finally(() => setIsLoading(false));
  }, [agent.id]);

  const markdown = error
    ? `# Agent Logs Unavailable\n\n${error}`
    : `# ${agent.name || agent.id || "Agent Logs"}\n\n\`\`\`text\n${escapeCodeFence(logs || "No log output returned.")}\n\`\`\``;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {agent.id && (
            <Action
              title="Attach in Terminal"
              icon={Icon.Terminal}
              onAction={() =>
                launchClaudeCommand(
                  buildAgentActionArgs("attach", agent.id!),
                  agent.cwd,
                )
              }
            />
          )}
          <Action.CopyToClipboard title="Copy Logs" content={logs} />
        </ActionPanel>
      }
    />
  );
}

function DispatchAgentForm({
  initialProjectPath,
  onDispatched,
}: {
  initialProjectPath?: string;
  onDispatched: () => Promise<void>;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  async function handleSubmit(values: DispatchAgentOptions) {
    setIsLoading(true);
    try {
      const output = await dispatchAgent(values);
      await showToast({
        style: Toast.Style.Success,
        title: "Agent Dispatched",
        message: output || "Claude is working in the background",
      });
      pop();
      await onDispatched();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Dispatch Failed",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Dispatch Agent"
            icon={Icon.Play}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="projectPath"
        title="Project Path"
        defaultValue={initialProjectPath || os.homedir()}
        placeholder="~/Projects/my-app"
        info="Git projects use Claude Code's native worktree isolation."
      />
      <Form.TextArea
        id="task"
        title="Task"
        placeholder="Describe the work and a concrete completion condition..."
        autoFocus
      />
      <Form.TextField
        id="name"
        title="Agent Name"
        placeholder="Optional display name"
      />
      <Form.Dropdown id="model" title="Model" defaultValue="">
        <Form.Dropdown.Item title="Use Claude Default" value="" />
        <Form.Dropdown.Item title="Fable" value="fable" />
        <Form.Dropdown.Item title="Sonnet" value="sonnet" />
        <Form.Dropdown.Item title="Opus" value="opus" />
        <Form.Dropdown.Item title="Haiku" value="haiku" />
      </Form.Dropdown>
      <Form.Dropdown id="effort" title="Effort" defaultValue="">
        <Form.Dropdown.Item title="Use Claude Default" value="" />
        <Form.Dropdown.Item title="Low" value="low" />
        <Form.Dropdown.Item title="Medium" value="medium" />
        <Form.Dropdown.Item title="High" value="high" />
        <Form.Dropdown.Item title="Extra High" value="xhigh" />
        <Form.Dropdown.Item title="Maximum" value="max" />
      </Form.Dropdown>
      <Form.Dropdown
        id="permissionMode"
        title="Permission Mode"
        defaultValue="default"
      >
        <Form.Dropdown.Item title="Default" value="default" />
        <Form.Dropdown.Item title="Plan Mode" value="plan" />
        <Form.Dropdown.Item title="Auto Edit" value="acceptEdits" />
        <Form.Dropdown.Item title="Auto Mode" value="auto" />
        <Form.Dropdown.Item title="Do Not Ask" value="dontAsk" />
      </Form.Dropdown>
      <Form.Description
        title="Isolation"
        text="Claude Code normally creates a worktree for background edits in a Git repository. Projects can disable this behavior, and non-Git directories are not isolated."
      />
    </Form>
  );
}

function getStateLabel(agent: ClaudeAgentSession): string {
  if (agent.waitingFor) return "Needs Input";
  if (agent.state !== "unknown") {
    return agent.state.charAt(0).toUpperCase() + agent.state.slice(1);
  }
  if (agent.status) {
    return agent.status.charAt(0).toUpperCase() + agent.status.slice(1);
  }
  if (agent.kind === "interactive") return "Foreground";
  return agent.rawState || "Unknown";
}

function getStateColor(section: ReturnType<typeof getAgentSection>): Color {
  switch (section) {
    case "needs-input":
      return Color.Orange;
    case "working":
      return Color.Blue;
    case "completed":
      return Color.Green;
    case "failed":
      return Color.Red;
    case "foreground":
      return Color.Purple;
    default:
      return Color.SecondaryText;
  }
}

function getStateIcon(section: ReturnType<typeof getAgentSection>): Icon {
  switch (section) {
    case "needs-input":
      return Icon.QuestionMark;
    case "working":
      return Icon.CircleProgress;
    case "completed":
      return Icon.CheckCircle;
    case "failed":
      return Icon.ExclamationMark;
    case "foreground":
      return Icon.Terminal;
    default:
      return Icon.Circle;
  }
}

function formatAge(startedAt: number): string {
  const elapsed = Math.max(0, Date.now() - startedAt);
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function escapeCodeFence(value: string): string {
  return value.replace(/```/g, "` ` `");
}
