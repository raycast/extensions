import { Icon, LaunchType, MenuBarExtra, open, launchCommand } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listSessions, getSessionUrl, getSessionsPageUrl, normalizeStatus, SessionSummary } from "./api";

function sessionTitle(session: SessionSummary): string {
  return session.title || `Session ${session.session_id.slice(0, 8)}`;
}

function groupByStatus(sessions: SessionSummary[]): Record<string, SessionSummary[]> {
  const groups: Record<string, SessionSummary[]> = {
    blocked: [],
    working: [],
    suspended: [],
  };
  for (const s of sessions) {
    const status = normalizeStatus(s.status, s.status_enum);
    if (status in groups) {
      groups[status].push(s);
    }
  }
  return groups;
}

function buildMenuTitle(groups: Record<string, SessionSummary[]>): string | undefined {
  const blocked = groups.blocked.length;
  const working = groups.working.length;
  const parts: string[] = [];
  if (blocked > 0) parts.push(`${blocked}⚠`);
  if (working > 0) parts.push(`${working}▶`);
  return parts.length > 0 ? parts.join(" ") : undefined;
}

export default function MenubarSessions() {
  const {
    data: sessions,
    isLoading,
    revalidate,
  } = useCachedPromise(async () => {
    return await listSessions(100);
  }, []);

  const groups = groupByStatus(sessions ?? []);
  const menuTitle = buildMenuTitle(groups);
  const totalActive = groups.blocked.length + groups.working.length + groups.suspended.length;

  return (
    <MenuBarExtra icon="extension-icon.png" title={menuTitle} tooltip="Devin Sessions" isLoading={isLoading}>
      {totalActive === 0 && !isLoading && <MenuBarExtra.Item title="No active sessions" />}

      {groups.blocked.length > 0 && (
        <MenuBarExtra.Section title={`Needs Input (${groups.blocked.length})`}>
          {groups.blocked.map((s) => (
            <MenuBarExtra.Item
              key={s.session_id}
              title={sessionTitle(s)}
              icon={Icon.ExclamationMark}
              onAction={() => open(getSessionUrl(s.session_id))}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      {groups.working.length > 0 && (
        <MenuBarExtra.Section title={`Working (${groups.working.length})`}>
          {groups.working.map((s) => (
            <MenuBarExtra.Item
              key={s.session_id}
              title={sessionTitle(s)}
              icon={Icon.CircleProgress}
              onAction={() => open(getSessionUrl(s.session_id))}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      {groups.suspended.length > 0 && (
        <MenuBarExtra.Section title={`Suspended (${groups.suspended.length})`}>
          {groups.suspended.map((s) => (
            <MenuBarExtra.Item
              key={s.session_id}
              title={sessionTitle(s)}
              icon={Icon.Pause}
              onAction={() => open(getSessionUrl(s.session_id))}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open All Sessions"
          icon={Icon.AppWindowList}
          onAction={() => open(getSessionsPageUrl())}
        />
        <MenuBarExtra.Item
          title="New Session"
          icon={Icon.Plus}
          onAction={() => launchCommand({ name: "new-session", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
