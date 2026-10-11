import { Color, List } from "@raycast/api";
import { useState } from "react";
import { AgentActions } from "./components/AgentActions";
import { Unavailable } from "./components/Unavailable";
import { adapterName, ago, doing, formatCost, needsYou, place, statusIcon, statusLabel } from "./lib/format";
import { useAgents } from "./lib/useAgents";
import { Agent } from "./lib/types";

function AgentItem(props: { agent: Agent; onChange: () => void }) {
  const { agent } = props;
  const cost = formatCost(agent.usage);
  const accessories: List.Item.Accessory[] = [];
  if (agent.project?.branch) accessories.push({ tag: { value: agent.project.branch, color: Color.SecondaryText } });
  if (agent.ports.length > 0) accessories.push({ text: `:${agent.ports[0]}` });
  if (cost) accessories.push({ text: cost, tooltip: "Estimated at API list prices" });
  accessories.push({ text: ago(agent.lastActivity), tooltip: new Date(agent.lastActivity).toLocaleString() });
  return (
    <List.Item
      icon={{ value: statusIcon(agent.status), tooltip: statusLabel[agent.status] }}
      title={agent.name}
      subtitle={doing(agent) ?? place(agent)}
      keywords={[place(agent), adapterName(agent), agent.project?.branch ?? "", agent.slug]}
      accessories={accessories}
      actions={<AgentActions agent={agent} onChange={props.onChange} />}
    />
  );
}

export default function Command() {
  const [showEnded, setShowEnded] = useState(false);
  const { data, isLoading, error, revalidate } = useAgents(showEnded);
  const agents = data ?? [];
  const waiting = agents.filter(needsYou);
  const active = agents.filter((agent) => !needsYou(agent) && agent.status !== "ended");
  const ended = agents.filter((agent) => agent.status === "ended");

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search agents by name, project or branch"
      searchBarAccessory={
        <List.Dropdown tooltip="Show" onChange={(value) => setShowEnded(value === "all")}>
          <List.Dropdown.Item title="Running" value="running" />
          <List.Dropdown.Item title="All, Including Ended" value="all" />
        </List.Dropdown>
      }
    >
      {error && !data ? (
        <Unavailable error={error} />
      ) : (
        <>
          <List.EmptyView
            title="No agents running"
            description="Start one from Office Space, Run Recipe, or run claude in a terminal."
          />
          <List.Section title="Needs You" subtitle={waiting.length ? `${waiting.length}` : undefined}>
            {waiting.map((agent) => (
              <AgentItem key={agent.id} agent={agent} onChange={revalidate} />
            ))}
          </List.Section>
          <List.Section title="Working and Idle">
            {active.map((agent) => (
              <AgentItem key={agent.id} agent={agent} onChange={revalidate} />
            ))}
          </List.Section>
          <List.Section title="Ended">
            {ended.map((agent) => (
              <AgentItem key={agent.id} agent={agent} onChange={revalidate} />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
