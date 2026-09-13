import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useMemo } from "react";
import { listSessions, ClaudeSession } from "./lib/sessions";
import { relativeTime } from "./lib/relative-time";
import SessionDetail from "./session-detail";
import { SessionUtilityActions } from "./session-actions";

const PINNED_SESSIONS_KEY = "pinned-sessions";

function SessionItem({
  session,
  isPinned,
  onTogglePin,
}: {
  session: ClaudeSession;
  isPinned: boolean;
  onTogglePin: () => void;
}) {
  return (
    <List.Item
      id={session.id}
      title={session.title ?? "Untitled session"}
      keywords={[session.cwd, session.gitBranch ?? "", session.projectName]}
      accessories={[
        ...(session.gitBranch && session.gitBranch !== "HEAD" ? [{ tag: session.gitBranch }] : []),
        { text: session.projectName },
        { date: session.lastActiveAt, tooltip: relativeTime(session.lastActiveAt) },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Details"
            icon={Icon.Sidebar}
            target={<SessionDetail session={session} isPinned={isPinned} onTogglePin={onTogglePin} />}
          />
          <SessionUtilityActions session={session} isPinned={isPinned} onTogglePin={onTogglePin} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const sessions = useMemo(() => listSessions(), []);

  const { value: pinnedIds = [], setValue: setPinnedIds } = useLocalStorage<string[]>(PINNED_SESSIONS_KEY, []);
  const pinnedSet = useMemo(() => new Set(pinnedIds), [pinnedIds]);

  const pinned = sessions.filter((session) => pinnedSet.has(session.id));
  const recent = sessions.filter((session) => !pinnedSet.has(session.id));

  function togglePin(id: string) {
    setPinnedIds(pinnedSet.has(id) ? pinnedIds.filter((pinnedId) => pinnedId !== id) : [...pinnedIds, id]);
  }

  return (
    <List searchBarPlaceholder="Search Claude sessions...">
      {sessions.length === 0 ? (
        <List.EmptyView
          title="No Claude sessions found"
          description="Run `claude` at least once in a project to create a session."
        />
      ) : (
        <>
          {pinned.length > 0 && (
            <List.Section title="Pinned">
              {pinned.map((session) => (
                <SessionItem key={session.id} session={session} isPinned onTogglePin={() => togglePin(session.id)} />
              ))}
            </List.Section>
          )}
          <List.Section title="Recent">
            {recent.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isPinned={false}
                onTogglePin={() => togglePin(session.id)}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
