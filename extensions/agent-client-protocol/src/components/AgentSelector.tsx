import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { useMemo } from "react";
import type { AgentConfig, AgentSelectorProps, AgentHealthRecord } from "@/types/extension";

export function getAgentSubtitle(agent: AgentConfig): string {
  const parts: string[] = [];

  if (agent.type === "subprocess") {
    const commandTokens = [agent.command, ...(agent.args ?? [])].filter((token): token is string =>
      Boolean(token && token.trim()),
    );
    if (commandTokens.length > 0) {
      parts.push(`Command: ${commandTokens.join(" ")}`);
    }

    if (agent.workingDirectory) {
      parts.push(`CWD: ${agent.workingDirectory}`);
    }
  }

  if (agent.type === "remote" && agent.endpoint) {
    parts.push(`Remote: ${agent.endpoint}`);
  }

  return parts.join(" • ");
}

export function getAgentHealthAccessory(health?: AgentHealthRecord): List.Item.Accessory | undefined {
  if (!health) {
    return undefined;
  }

  const basics = [`Last checked: ${health.lastChecked.toLocaleString()}`];
  if (typeof health.latencyMs === "number") {
    basics.push(`${health.latencyMs} ms`);
  }
  if (health.error) {
    basics.push(health.error);
  }

  if (health.status === "healthy") {
    return {
      text: "Healthy",
      icon: { source: Icon.Checkmark, tintColor: Color.Green },
      tooltip: basics.join(" • "),
    };
  }

  return {
    text: "Unhealthy",
    icon: { source: Icon.XMarkCircle, tintColor: Color.Red },
    tooltip: basics.join(" • "),
  };
}

export default function AgentSelector(props: AgentSelectorProps) {
  const { agents, selectedAgentId, onSelectAgent, onConfigureAgent, onTestAgent, isLoading, healthMap } = props;

  const { pop } = useNavigation();

  const sortedAgents = useMemo(() => {
    return [...agents].sort((a, b) => {
      if (!!a.isBuiltIn === !!b.isBuiltIn) {
        return a.name.localeCompare(b.name);
      }
      return a.isBuiltIn ? -1 : 1;
    });
  }, [agents]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search agents..."
      navigationTitle="Select Agent"
      selectedItemId={selectedAgentId}
    >
      <List.EmptyView
        title="No Agents Configured"
        icon={Icon.ComputerChip}
        description="Add an agent configuration to start chatting."
        actions={
          <ActionPanel>
            <Action title="Open Agent Settings" icon={Icon.Gear} onAction={onConfigureAgent} />
          </ActionPanel>
        }
      />

      <List.Section title="Agents" subtitle={`${sortedAgents.length}`}>
        {sortedAgents.map((agent) => {
          const accessories: List.Item.Accessory[] = [];
          if (agent.isBuiltIn) {
            accessories.push({ icon: Icon.ComputerChip, tooltip: "Built-in agent" });
          }

          if (agent.lastUsed) {
            accessories.push({ text: `Last used ${agent.lastUsed.toLocaleDateString()}` });
          }

          const healthAccessory = getAgentHealthAccessory(healthMap?.[agent.id]);
          if (healthAccessory) {
            accessories.push(healthAccessory);
          }

          return (
            <List.Item
              key={agent.id}
              id={agent.id}
              icon={agent.isBuiltIn ? Icon.ComputerChip : Icon.Gear}
              title={agent.name}
              subtitle={getAgentSubtitle(agent)}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action
                    title="Select Agent"
                    icon={Icon.Checkmark}
                    onAction={() => {
                      onSelectAgent(agent.id);
                      // Popping inside try/catch to avoid navigation errors in root context
                      try {
                        pop();
                      } catch {
                        // noop when pop not available
                      }
                    }}
                  />
                  <Action title="Configure Agents" icon={Icon.Gear} onAction={onConfigureAgent} />
                  {onTestAgent && (
                    <Action title="Test Connection" icon={Icon.Link} onAction={() => onTestAgent(agent.id)} />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
