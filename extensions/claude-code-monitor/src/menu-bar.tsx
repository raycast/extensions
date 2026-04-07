import {
  MenuBarExtra,
  Icon,
  Color,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useSessions } from "./hooks/useSessions";
import { focusSession } from "./lib/terminal";
import { formatRelativeTime, formatDuration } from "./lib/time";
import { formatCost } from "./lib/usage-stats";
import {
  STATE_CONFIG,
  DEFAULT_STATE_CONFIG,
  getSessionTitle,
  getAppLabel,
} from "./lib/constants";
import { Session } from "./types";

export default function MenuBarCommand() {
  const {
    activeSessions,
    waitingSessions,
    idleSessions,
    endedSessions,
    isLoading,
  } = useSessions(10000);

  const liveCount =
    activeSessions.length + waitingSessions.length + idleSessions.length;
  const hasActive = activeSessions.length > 0;
  const hasWaiting = waitingSessions.length > 0;

  const title = liveCount > 0 ? `${liveCount}` : undefined;
  const icon = hasWaiting
    ? { source: Icon.Terminal, tintColor: Color.Orange }
    : hasActive
      ? { source: Icon.Terminal, tintColor: Color.Green }
      : liveCount > 0
        ? { source: Icon.Terminal, tintColor: Color.Yellow }
        : { source: Icon.Terminal, tintColor: Color.SecondaryText };

  return (
    <MenuBarExtra
      icon={icon}
      title={title}
      tooltip={`Claude Code: ${liveCount} session(s)`}
      isLoading={isLoading}
    >
      {waitingSessions.length > 0 && (
        <MenuBarExtra.Section
          title={`Waiting for Input (${waitingSessions.length})`}
        >
          {waitingSessions.map((s) => (
            <SessionMenuItem key={s.session_id} session={s} />
          ))}
        </MenuBarExtra.Section>
      )}
      {activeSessions.length > 0 && (
        <MenuBarExtra.Section title={`Active (${activeSessions.length})`}>
          {activeSessions.map((s) => (
            <SessionMenuItem key={s.session_id} session={s} />
          ))}
        </MenuBarExtra.Section>
      )}
      {idleSessions.length > 0 && (
        <MenuBarExtra.Section title={`Idle (${idleSessions.length})`}>
          {idleSessions.map((s) => (
            <SessionMenuItem key={s.session_id} session={s} />
          ))}
        </MenuBarExtra.Section>
      )}
      {endedSessions.length > 0 && (
        <MenuBarExtra.Section
          title={`Recently Ended (${endedSessions.length})`}
        >
          {endedSessions.slice(0, 5).map((s) => (
            <SessionMenuItem key={s.session_id} session={s} />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Session List"
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          onAction={() =>
            launchCommand({ name: "sessions", type: LaunchType.UserInitiated })
          }
        />
        <MenuBarExtra.Item
          title="Usage Dashboard"
          icon={Icon.BarChart}
          shortcut={{ modifiers: ["cmd"], key: "u" }}
          onAction={() =>
            launchCommand({
              name: "usage-dashboard",
              type: LaunchType.UserInitiated,
            })
          }
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function SessionMenuItem({ session }: { session: Session }) {
  const config = STATE_CONFIG[session.state] || DEFAULT_STATE_CONFIG;
  const stateIcon = { source: config.icon, tintColor: config.color };
  const startedAt = session.started_at || Date.now();
  const endedAt = session.ended_at ?? Date.now();
  const duration = formatDuration(startedAt, endedAt);
  const lastUpdate = formatRelativeTime(session.last_updated_at || Date.now());
  const costStr =
    session.cost != null && session.cost > 0
      ? ` | ${formatCost(session.cost)}`
      : "";
  const appLabel = getAppLabel(
    session.term_program,
    session.terminal_emulator,
    session.bundle_id,
  );
  const appStr = appLabel ? `${appLabel} | ` : "";

  const title = getSessionTitle(session);

  return (
    <MenuBarExtra.Item
      title={title}
      subtitle={`${appStr}${duration} | ${lastUpdate}${costStr}`}
      icon={stateIcon}
      onAction={() => focusSession(session).catch(console.error)}
    />
  );
}
