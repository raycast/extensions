import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { AgentActions } from "./components/resource-actions";
import { StartAgentForm } from "./components/start-agent-form";
import { useHerdrSnapshot } from "./hooks/use-herdr-snapshot";
import { agentIcon } from "./lib/agent-appearance";
import type { AgentStatus } from "./lib/types";
import { ErrorView, shortcuts, statusIcon, statusTitle } from "./lib/ui";

type Filter = "all" | AgentStatus;

export default function Command() {
  const snapshot = useHerdrSnapshot();
  const [filter, setFilter] = useState<Filter>("all");
  if (snapshot.error && !snapshot.data) return <ErrorView error={snapshot.error} onRetry={snapshot.revalidate} />;
  const allAgents = snapshot.data?.agents || [];
  const agents = filter === "all" ? allAgents : allAgents.filter((agent) => agent.agent_status === filter);

  return (
    <List
      isLoading={snapshot.isLoading}
      searchBarPlaceholder="Search agents, names, projects, paths…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Agents" value={filter} onChange={(value) => setFilter(value as Filter)}>
          <List.Dropdown.Item value="all" title="All Agents" />
          <List.Dropdown.Item value="blocked" title="Needs Attention" icon={statusIcon("blocked")} />
          <List.Dropdown.Item value="done" title="Done" icon={statusIcon("done")} />
          <List.Dropdown.Item value="working" title="Working" icon={statusIcon("working")} />
          <List.Dropdown.Item value="idle" title="Idle" icon={statusIcon("idle")} />
          <List.Dropdown.Item value="unknown" title="Unknown" icon={statusIcon("unknown")} />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Person}
        title={
          snapshot.isLoading
            ? "Loading Agents…"
            : filter === "all"
              ? "No Live Agents"
              : `No ${statusTitle(filter)} Agents`
        }
        description={
          filter === "all" ? "Start a coding agent in an available Herdr shell pane." : "Choose another status filter."
        }
      />
      {agents.map((agent) => {
        const workspace = snapshot.data?.workspaces.find((item) => item.workspace_id === agent.workspace_id);
        const tab = snapshot.data?.tabs.find((item) => item.tab_id === agent.tab_id);
        const name = agent.name || agent.display_agent || agent.agent || agent.pane_id;
        return (
          <List.Item
            key={agent.pane_id}
            icon={agentIcon(agent.agent || agent.display_agent)}
            title={name}
            subtitle={`${workspace?.label || agent.workspace_id} › ${tab?.label || agent.tab_id}`}
            keywords={[
              agent.agent || "",
              agent.pane_id,
              agent.name || "",
              agent.foreground_cwd || "",
              agent.cwd || "",
              agent.terminal_title || "",
            ]}
            accessories={[
              { tag: { value: statusTitle(agent.agent_status), color: statusIcon(agent.agent_status).tintColor } },
              ...(agent.focused ? [{ tag: "Focused" }] : []),
            ]}
            actions={<AgentActions agent={agent} agents={allAgents} onDone={snapshot.revalidate} />}
          />
        );
      })}
      {filter === "all" && !snapshot.isLoading ? (
        <List.Section title={agents.length > 0 ? "Actions" : "Get Started"}>
          <List.Item
            icon={Icon.Play}
            title={agents.length > 0 ? "Start Another Agent" : "Start Your First Agent"}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Start Agent"
                  icon={Icon.Play}
                  target={<StartAgentForm onDone={snapshot.revalidate} />}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={shortcuts.refresh}
                  onAction={snapshot.revalidate}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
    </List>
  );
}
