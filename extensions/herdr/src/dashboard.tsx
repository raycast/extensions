import { Action, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { CreateWorkspaceForm } from "./components/create-workspace-form";
import { AgentActions, PaneActions, TabActions, WorkspaceActions } from "./components/resource-actions";
import { StartAgentForm } from "./components/start-agent-form";
import { useHerdrSnapshot } from "./hooks/use-herdr-snapshot";
import { agentIcon } from "./lib/agent-appearance";
import type { AgentInfo, PaneInfo } from "./lib/types";
import { ErrorView, statusIcon, statusTitle } from "./lib/ui";

type Scope = "all" | "attention" | "workspaces" | "tabs" | "panes" | "agents";

function agentLabel(agent: AgentInfo): string {
  return agent.name || agent.display_agent || agent.agent || agent.pane_id;
}

function paneLabel(pane: PaneInfo): string {
  return (
    pane.title || pane.display_agent || pane.agent || pane.terminal_title_stripped || pane.terminal_title || "Shell"
  );
}

export default function Command() {
  const snapshot = useHerdrSnapshot();
  const [scope, setScope] = useState<Scope>("all");
  const data = snapshot.data;

  const attention = useMemo(
    () => (data?.agents || []).filter((agent) => agent.agent_status === "blocked" || agent.agent_status === "done"),
    [data?.agents],
  );

  if (snapshot.error && !data) return <ErrorView error={snapshot.error} onRetry={snapshot.revalidate} />;

  const show = (value: Scope) => scope === "all" || scope === value;
  const workspaces = data?.workspaces || [];
  const tabs = data?.tabs || [];
  const panes = data?.panes || [];
  const agents = data?.agents || [];
  const listedPanes =
    scope === "agents"
      ? agents
      : scope === "all"
        ? panes.filter((pane) => !agents.some((agent) => agent.pane_id === pane.pane_id))
        : panes;

  return (
    <List
      isLoading={snapshot.isLoading}
      searchBarPlaceholder="Search workspaces, tabs, panes, agents, paths…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Dashboard" value={scope} onChange={(value) => setScope(value as Scope)}>
          <List.Dropdown.Item value="all" title="Everything" />
          <List.Dropdown.Item value="attention" title="Needs Attention" />
          <List.Dropdown.Item value="workspaces" title="Workspaces" />
          <List.Dropdown.Item value="tabs" title="Tabs" />
          <List.Dropdown.Item value="panes" title="Panes" />
          <List.Dropdown.Item value="agents" title="Agents" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Terminal}
        title={
          snapshot.isLoading
            ? "Loading Herdr…"
            : scope === "attention"
              ? "No Agent Needs Attention"
              : `No ${scope === "all" ? "Herdr Resources" : scope[0].toUpperCase() + scope.slice(1)}`
        }
        description={
          scope === "attention"
            ? "Blocked and unseen completed agents appear here."
            : "Create a workspace to get started."
        }
      />

      {(scope === "all" || scope === "attention") && attention.length > 0 ? (
        <List.Section title="Needs Attention" subtitle={`${attention.length}`}>
          {attention.map((agent) => (
            <List.Item
              key={`attention-${agent.pane_id}`}
              icon={agentIcon(agent.agent || agent.display_agent)}
              title={agentLabel(agent)}
              subtitle={agent.terminal_title_stripped || agent.foreground_cwd || agent.cwd}
              keywords={[agent.agent || "", agent.pane_id, agent.workspace_id, agent.tab_id, agent.cwd || ""]}
              accessories={[
                { tag: { value: statusTitle(agent.agent_status), color: statusIcon(agent.agent_status).tintColor } },
              ]}
              actions={<AgentActions agent={agent} agents={agents} onDone={snapshot.revalidate} />}
            />
          ))}
        </List.Section>
      ) : null}

      {show("workspaces") ? (
        <List.Section title="Workspaces" subtitle={`${workspaces.length}`}>
          {workspaces.map((workspace) => (
            <List.Item
              key={workspace.workspace_id}
              icon={workspace.worktree ? Icon.Hammer : Icon.Folder}
              title={workspace.label}
              subtitle={`${workspace.workspace_id} · ${workspace.tab_count} tab${workspace.tab_count === 1 ? "" : "s"} · ${workspace.pane_count} pane${workspace.pane_count === 1 ? "" : "s"}`}
              keywords={[
                workspace.workspace_id,
                workspace.worktree?.repo_name || "",
                workspace.worktree?.repo_root || "",
                workspace.worktree?.checkout_path || "",
              ]}
              accessories={[
                ...(workspace.worktree?.repo_name ? [{ tag: workspace.worktree.repo_name }] : []),
                { icon: statusIcon(workspace.agent_status), tooltip: statusTitle(workspace.agent_status) },
                ...(workspace.focused ? [{ tag: "Focused" }] : []),
              ]}
              actions={
                <WorkspaceActions
                  workspace={workspace}
                  workspacePath={panes.find((pane) => pane.workspace_id === workspace.workspace_id)?.cwd}
                  onDone={snapshot.revalidate}
                />
              }
            />
          ))}
        </List.Section>
      ) : null}

      {show("tabs") ? (
        <List.Section title="Tabs" subtitle={`${tabs.length}`}>
          {tabs.map((tab) => {
            const workspace = workspaces.find((candidate) => candidate.workspace_id === tab.workspace_id);
            return (
              <List.Item
                key={tab.tab_id}
                icon={Icon.AppWindowList}
                title={tab.label}
                subtitle={`${workspace?.label || tab.workspace_id} · ${tab.tab_id} · ${tab.pane_count} pane${tab.pane_count === 1 ? "" : "s"}`}
                keywords={[tab.tab_id, tab.workspace_id, workspace?.label || ""]}
                accessories={[
                  { icon: statusIcon(tab.agent_status), tooltip: statusTitle(tab.agent_status) },
                  ...(tab.focused ? [{ tag: "Focused" }] : []),
                ]}
                actions={<TabActions tab={tab} onDone={snapshot.revalidate} />}
              />
            );
          })}
        </List.Section>
      ) : null}

      {show("panes") || scope === "agents" ? (
        <List.Section title={scope === "agents" ? "Agents" : "Panes"} subtitle={`${listedPanes.length}`}>
          {listedPanes.map((pane) => {
            const workspace = workspaces.find((candidate) => candidate.workspace_id === pane.workspace_id);
            const tab = tabs.find((candidate) => candidate.tab_id === pane.tab_id);
            const agent = agents.find((candidate) => candidate.pane_id === pane.pane_id);
            return (
              <List.Item
                key={`${scope}-${pane.pane_id}`}
                icon={agent ? agentIcon(agent.agent || agent.display_agent) : Icon.Terminal}
                title={paneLabel(pane)}
                subtitle={`${workspace?.label || pane.workspace_id} › ${tab?.label || pane.tab_id}`}
                keywords={[
                  pane.pane_id,
                  pane.cwd || "",
                  pane.foreground_cwd || "",
                  pane.terminal_title || "",
                  agent?.agent || "",
                ]}
                accessories={[
                  ...(agent
                    ? [
                        {
                          tag: {
                            value: statusTitle(agent.agent_status),
                            color: statusIcon(agent.agent_status).tintColor,
                          },
                        },
                      ]
                    : []),
                  ...(pane.focused ? [{ tag: "Focused" }] : []),
                ]}
                actions={<PaneActions pane={pane} agents={agents} onDone={snapshot.revalidate} />}
              />
            );
          })}
        </List.Section>
      ) : null}

      {scope === "all" && agents.length > 0 ? (
        <List.Section title="Agents" subtitle={`${agents.length}`}>
          {agents.map((agent) => (
            <List.Item
              key={`agent-${agent.pane_id}`}
              icon={agentIcon(agent.agent || agent.display_agent)}
              title={agentLabel(agent)}
              subtitle={agent.foreground_cwd || agent.cwd || agent.pane_id}
              keywords={[agent.agent || "", agent.pane_id, agent.name || "", agent.terminal_title || ""]}
              accessories={[
                { tag: { value: statusTitle(agent.agent_status), color: statusIcon(agent.agent_status).tintColor } },
              ]}
              actions={<AgentActions agent={agent} agents={agents} onDone={snapshot.revalidate} />}
            />
          ))}
        </List.Section>
      ) : null}

      {!snapshot.isLoading && panes.length === 0 ? (
        <List.Section title="Quick Start">
          <List.Item
            icon={Icon.Plus}
            title="Create Your First Workspace"
            actions={
              <Action.Push title="Create Workspace" target={<CreateWorkspaceForm onDone={snapshot.revalidate} />} />
            }
          />
          <List.Item
            icon={Icon.Person}
            title="Start an Agent"
            actions={<Action.Push title="Start Agent" target={<StartAgentForm onDone={snapshot.revalidate} />} />}
          />
        </List.Section>
      ) : null}
    </List>
  );
}
