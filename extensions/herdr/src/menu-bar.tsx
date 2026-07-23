import { Icon, Keyboard, LaunchType, MenuBarExtra, launchCommand, openExtensionPreferences } from "@raycast/api";
import { useHerdrSnapshot } from "./hooks/use-herdr-snapshot";
import { agentIcon } from "./lib/agent-appearance";
import { focusResource, getAgentTarget } from "./lib/herdr";
import { getHerdrPreferences } from "./lib/preferences";
import { launchHerdrInTerminal, revealFocusedHerdr } from "./lib/terminal";
import type { AgentInfo, AgentStatus, HerdrSnapshot } from "./lib/types";
import { statusIcon, statusTitle } from "./lib/ui";

const DISPLAYED_STATUSES: AgentStatus[] = ["blocked", "done", "working", "unknown"];

function agentName(agent: AgentInfo): string {
  return agent.name || agent.display_agent || agent.agent || agent.pane_id;
}

function agentLocation(agent: AgentInfo, snapshot: HerdrSnapshot): string {
  const workspace = snapshot.workspaces.find((item) => item.workspace_id === agent.workspace_id);
  const tab = snapshot.tabs.find((item) => item.tab_id === agent.tab_id);
  return (
    [workspace?.label, tab?.label].filter(Boolean).join(" › ") || agent.foreground_cwd || agent.cwd || agent.pane_id
  );
}

async function focusAgent(agent: AgentInfo): Promise<void> {
  await focusResource("agent", getAgentTarget(agent));
  await revealFocusedHerdr();
}

function AgentItem({ agent, snapshot }: { agent: AgentInfo; snapshot: HerdrSnapshot }) {
  return (
    <MenuBarExtra.Item
      icon={agentIcon(agent.agent || agent.display_agent)}
      title={agentName(agent)}
      subtitle={agentLocation(agent, snapshot)}
      tooltip={`${statusTitle(agent.agent_status)} · ${agentLocation(agent, snapshot)}`}
      onAction={() => void focusAgent(agent)}
    />
  );
}

export default function Command() {
  const snapshot = useHerdrSnapshot();
  const data = snapshot.data;
  const agents = data?.agents || [];
  const groups = new Map<AgentStatus, AgentInfo[]>(
    (["blocked", "done", "working", "idle", "unknown"] as AgentStatus[]).map((status) => [
      status,
      agents.filter((agent) => agent.agent_status === status),
    ]),
  );
  const blocked = groups.get("blocked") || [];
  const done = groups.get("done") || [];
  const working = groups.get("working") || [];
  const idle = groups.get("idle") || [];
  const unknown = groups.get("unknown") || [];
  const significantCount = blocked.length + done.length + working.length + unknown.length;
  const visible = getHerdrPreferences().showIdleInMenuBar !== false || significantCount > 0;
  const leadingStatus: AgentStatus | undefined =
    blocked.length > 0
      ? "blocked"
      : done.length > 0
        ? "done"
        : working.length > 0
          ? "working"
          : unknown.length > 0
            ? "unknown"
            : undefined;
  const leadingCount = leadingStatus ? groups.get(leadingStatus)?.length : undefined;

  if (!visible) return null;

  return (
    <MenuBarExtra
      isLoading={snapshot.isLoading}
      icon={leadingStatus ? statusIcon(leadingStatus) : Icon.Terminal}
      title={leadingCount ? String(leadingCount) : undefined}
      tooltip={
        snapshot.error
          ? "Herdr is unavailable"
          : `Herdr · ${blocked.length} need attention · ${done.length} done · ${working.length} working · ${idle.length} idle`
      }
    >
      {snapshot.error ? (
        <MenuBarExtra.Item
          title="Herdr Unavailable — Open Herdr"
          icon={Icon.ExclamationMark}
          onAction={() => void launchHerdrInTerminal()}
        />
      ) : null}

      {data
        ? DISPLAYED_STATUSES.map((status) => {
            const group = groups.get(status) || [];
            if (group.length === 0) return null;
            return (
              <MenuBarExtra.Section key={status} title={`${statusTitle(status)} (${group.length})`}>
                {group.map((agent) => (
                  <AgentItem key={agent.pane_id} agent={agent} snapshot={data} />
                ))}
              </MenuBarExtra.Section>
            );
          })
        : null}

      {data && idle.length > 0 ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Submenu title={`Idle (${idle.length})`} icon={statusIcon("idle")}>
            {idle.map((agent) => (
              <AgentItem key={agent.pane_id} agent={agent} snapshot={data} />
            ))}
          </MenuBarExtra.Submenu>
        </MenuBarExtra.Section>
      ) : null}

      {!snapshot.isLoading && !snapshot.error && agents.length === 0 ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="No Live Agents" icon={Icon.Circle} />
        </MenuBarExtra.Section>
      ) : null}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Dashboard"
          icon={Icon.List}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => void launchCommand({ name: "dashboard", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Start Agent"
          icon={Icon.Person}
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={() => void launchCommand({ name: "start-agent", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Prompt Agent"
          icon={Icon.Message}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          onAction={() => void launchCommand({ name: "prompt-agent", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Open Herdr"
          icon={Icon.Terminal}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          onAction={() => void launchHerdrInTerminal()}
        />
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => void snapshot.revalidate()}
        />
        <MenuBarExtra.Item title="Preferences…" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
