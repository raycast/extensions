import {
  Clipboard,
  Color,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openCommandPreferences,
  showHUD,
} from "@raycast/api";
import { Agent, useAgents } from "./cursor";
import { useAgentNotifications } from "./notification";
import { formatPrSubtitle, formatPrTitle, getStatusIconSimple, groupAgents } from "./utils";
import { showFailureToast } from "@raycast/utils";

function AlternateAgentMenuBarItem({ agent }: { agent: Agent }) {
  if (!agent.target.prUrl) {
    return null;
  }

  return (
    <MenuBarExtra.Item
      key={`${agent.id}-pr`}
      icon={{ source: "pull-request-open.svg", tintColor: Color.PrimaryText }}
      title={formatPrTitle(agent.target.prUrl)}
      subtitle={formatPrSubtitle(agent.target.prUrl)}
      onAction={async (event) => {
        switch (event.type) {
          case "left-click":
            await open(agent.target.prUrl!);
            break;
          case "right-click":
            await Clipboard.copy(agent.target.prUrl!);
            await showHUD("Copied PR URL to clipboard");
            break;
        }
      }}
    />
  );
}

function AgentMenuBarItem({ agent }: { agent: Agent }) {
  return (
    <MenuBarExtra.Item
      key={agent.id}
      icon={getStatusIconSimple(agent)}
      title={agent.name}
      tooltip={agent.summary}
      alternate={<AlternateAgentMenuBarItem agent={agent} />}
      onAction={async (event) => {
        switch (event.type) {
          case "left-click":
            await open(agent.target.url);
            break;
          case "right-click":
            await Clipboard.copy(agent.target.url);
            await showHUD("Copied URL to clipboard");
            break;
        }
      }}
    />
  );
}

export default function MenuBar() {
  const { data, isLoading } = useAgents();
  const { titleCount, statusIcon } = useAgentNotifications(data);

  const { today, yesterday, thisWeek } = groupAgents(data);

  return (
    <MenuBarExtra icon={statusIcon} title={titleCount} isLoading={isLoading}>
      {today.length > 0 && (
        <MenuBarExtra.Section title="Today">
          {today.map((agent) => (
            <AgentMenuBarItem key={agent.id} agent={agent} />
          ))}
        </MenuBarExtra.Section>
      )}

      {yesterday.length > 0 && (
        <MenuBarExtra.Section title="Yesterday">
          {yesterday.map((agent) => (
            <AgentMenuBarItem key={agent.id} agent={agent} />
          ))}
        </MenuBarExtra.Section>
      )}

      {thisWeek.length > 0 && (
        <MenuBarExtra.Section title="This Week">
          {thisWeek.map((agent) => (
            <AgentMenuBarItem key={agent.id} agent={agent} />
          ))}
        </MenuBarExtra.Section>
      )}

      {today.length === 0 && yesterday.length === 0 && thisWeek.length === 0 && !isLoading && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="No recent agents" />
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={{ source: "icon-mono.svg", tintColor: Color.PrimaryText }}
          title="View All Agents"
          onAction={async () => {
            try {
              await launchCommand({ name: "list-agents", type: LaunchType.UserInitiated });
            } catch (e) {
              showFailureToast(e, { title: "Failed to launch list agents command" });
            }
          }}
        />
        <MenuBarExtra.Item
          icon={Icon.Globe}
          title="Open Dashboard"
          onAction={() => open("https://cursor.com/agents")}
        />
        <MenuBarExtra.Item icon={Icon.Gear} title="Configure Command" onAction={openCommandPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
