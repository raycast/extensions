import { Action, ActionPanel, Clipboard, Detail, List, closeMainWindow } from "@raycast/api";

import { getAgentIcon, getDivisionIcon, getSubgroupIcon } from "./icons";
import { Agent, getDivisionLabel, getGameDevelopmentSubgroupLabel } from "./parser";

type BrowseAgentsProps = {
  division: string;
  agents: Agent[];
  subgroup?: string;
};

type AgentDetailProps = {
  agent: Agent;
};

async function copyPromptAndClose(content: string) {
  await Clipboard.copy(content);
  await closeMainWindow({ clearRootSearch: true });
}

function AgentPreview({ agent }: AgentDetailProps) {
  const markdown = [
    `# ${agent.name}`,
    agent.divisionDescription ? `_${agent.divisionDescription}_` : "",
    agent.description ? `## Description\n${agent.description}` : "",
    agent.vibe ? `## Vibe\n${agent.vibe}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return <List.Item.Detail markdown={markdown} />;
}

function PromptDetail({ agent }: AgentDetailProps) {
  return (
    <Detail
      markdown={agent.content}
      actions={
        <ActionPanel>
          <Action
            title="Copy Agent"
            onAction={() => copyPromptAndClose(agent.content)}
            shortcut={{ modifiers: [], key: "enter" }}
          />
          <Action.OpenWith path={agent.file} />
        </ActionPanel>
      }
    />
  );
}

export default function BrowseAgents({ division, agents, subgroup }: BrowseAgentsProps) {
  const divisionLabel = getDivisionLabel(division);
  const divisionIcon = getDivisionIcon(division, agents.find((agent) => agent.divisionEmoji)?.divisionEmoji);
  const rootAgents = agents
    .filter((agent) => !agent.subgroup)
    .sort((left, right) => left.name.localeCompare(right.name, "en-US", { sensitivity: "base" }));
  const subgroups = Array.from(
    new Set(agents.map((agent) => agent.subgroup).filter((value): value is string => Boolean(value))),
  ).sort((left, right) =>
    getGameDevelopmentSubgroupLabel(left).localeCompare(getGameDevelopmentSubgroupLabel(right), "en-US", {
      sensitivity: "base",
    }),
  );
  const sortedAgents = [...agents].sort((left, right) =>
    left.name.localeCompare(right.name, "en-US", { sensitivity: "base" }),
  );

  if (division === "game-development" && !subgroup && subgroups.length > 0) {
    return (
      <List
        isLoading={false}
        isShowingDetail
        navigationTitle={`${divisionIcon} ${divisionLabel}`}
        searchBarPlaceholder="Browse game development"
      >
        {rootAgents.length > 0 ? (
          <List.Section title="Agents">
            {rootAgents.map((agent) => (
              <List.Item
                key={agent.file}
                icon={{
                  source: getAgentIcon(agent.slug, agent.division, agent.emoji, agent.rosterEmoji, agent.divisionEmoji),
                }}
                title={agent.name}
                detail={<AgentPreview agent={agent} />}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Agent"
                      target={<PromptDetail agent={agent} />}
                      shortcut={{ modifiers: [], key: "enter" }}
                    />
                    <Action
                      title="Copy Agent"
                      onAction={() => copyPromptAndClose(agent.content)}
                      shortcut={{ modifiers: ["cmd"], key: "enter" }}
                    />
                    <Action.OpenWith path={agent.file} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ) : null}
        {subgroups.length > 0 ? (
          <List.Section title="Sub-Divisions">
            {subgroups.map((subgroup) => {
              const subgroupAgents = agents.filter((agent) => agent.subgroup === subgroup);

              return (
                <List.Item
                  key={subgroup}
                  icon={{ source: getSubgroupIcon(subgroup) }}
                  title={getGameDevelopmentSubgroupLabel(subgroup)}
                  accessories={[{ text: `${subgroupAgents.length} agents` }]}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="Browse Agents"
                        target={<BrowseAgents division={division} subgroup={subgroup} agents={subgroupAgents} />}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        ) : null}
      </List>
    );
  }

  return (
    <List
      isLoading={false}
      isShowingDetail
      navigationTitle={
        subgroup
          ? `${getSubgroupIcon(subgroup)} ${getGameDevelopmentSubgroupLabel(subgroup)}`
          : `${divisionIcon} ${divisionLabel}`
      }
      searchBarPlaceholder={`Search ${subgroup ? getGameDevelopmentSubgroupLabel(subgroup) : divisionLabel} agents`}
    >
      {sortedAgents.map((agent) => (
        <List.Item
          key={agent.file}
          icon={{
            source: getAgentIcon(agent.slug, agent.division, agent.emoji, agent.rosterEmoji, agent.divisionEmoji),
          }}
          title={agent.name}
          detail={<AgentPreview agent={agent} />}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Agent"
                target={<PromptDetail agent={agent} />}
                shortcut={{ modifiers: [], key: "enter" }}
              />
              <Action
                title="Copy Agent"
                onAction={() => copyPromptAndClose(agent.content)}
                shortcut={{ modifiers: ["cmd"], key: "enter" }}
              />
              <Action.OpenWith path={agent.file} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
