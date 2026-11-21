import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { AgentChat } from "./components/agent-chat";
import { toAgentSummary, type AgentSummary } from "./lib/agent";
import { credentials } from "./lib/preferences";
import { listAgents, SITE_URL } from "./lib/wiro";

const AGENTS_URL = `${SITE_URL}/panel/agents`;

function statusIcon(agent: AgentSummary): { source: Icon; tintColor: Color } {
  if (agent.running) return { source: Icon.CircleFilled, tintColor: Color.Green };
  if (agent.statusLabel === "Error") return { source: Icon.CircleFilled, tintColor: Color.Red };
  if (["Queued", "Starting", "Stopping"].includes(agent.statusLabel))
    return { source: Icon.CircleFilled, tintColor: Color.Yellow };
  return { source: Icon.Circle, tintColor: Color.SecondaryText };
}

export default function MessageAgent() {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async () => (await listAgents(credentials())).map(toAgentSummary).filter((agent) => agent.guid),
    [],
    { keepPreviousData: true },
  );
  const agents = data ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter your agents">
      {!isLoading && agents.length === 0 && error && (
        <List.EmptyView icon={Icon.Warning} title="Could not load your agents" description={error.message} />
      )}
      {!isLoading && agents.length === 0 && !error && (
        <List.EmptyView
          icon={Icon.Person}
          title="No agents yet"
          description="Deploy an agent on wiro.ai, then message it from here."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Agents on Wiro AI" url={AGENTS_URL} />
            </ActionPanel>
          }
        />
      )}
      {agents.map((agent) => (
        <List.Item
          key={agent.guid}
          icon={statusIcon(agent)}
          title={agent.title}
          subtitle={agent.statusLabel}
          accessories={[
            { text: `${agent.creditsLeft.toLocaleString("en-US")} credits` },
            ...(agent.team ? [{ tag: "Team" }] : []),
          ]}
          actions={
            <ActionPanel>
              {agent.running ? (
                <Action.Push title="Message Agent" icon={Icon.Message} target={<AgentChat agent={agent} />} />
              ) : (
                <Action.OpenInBrowser title="Start Agent on Wiro AI" icon={Icon.Play} url={agent.url} />
              )}
              <Action.OpenInBrowser title="Open Agent on Wiro AI" icon={Icon.Globe} url={agent.url} />
              <Action.CopyToClipboard
                title="Copy Agent ID"
                content={agent.guid}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
