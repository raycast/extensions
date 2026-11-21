import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { displayName, formatUptime } from "../lib/format";
import { isImportant, LogEntry, LogKind, LogSession, parseLogs, sessionText } from "../lib/logs";
import { getLogs } from "../lib/pritunl";
import { Profile } from "../lib/types";

// Older connections rarely matter and make the list slow to render.
const MAX_SESSIONS = 10;

// Every kind uses the same small dot so rows line up, and only the colour tells them apart.
const KINDS: Record<LogKind, { label: string; color: Color }> = {
  error: { label: "Error", color: Color.Red },
  warning: { label: "Warning", color: Color.Orange },
  connected: { label: "Connected", color: Color.Green },
  disconnected: { label: "Disconnected", color: Color.Yellow },
  routes: { label: "Routes", color: Color.Blue },
  dns: { label: "DNS", color: Color.Blue },
  noise: { label: "Suppressed Output", color: Color.SecondaryText },
  info: { label: "Info", color: Color.PrimaryText },
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function formatDay(date: Date): string {
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function sessionTitle(session: LogSession): string {
  if (!session.start) return "Earlier Output";
  const time = session.start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${formatDay(session.start)}, ${time}`;
}

function sessionOutcome(session: LogSession, isLatest: boolean, profile: Profile): string | undefined {
  const { connectedAt, endedAt } = session;
  if (connectedAt && endedAt) {
    return `Connected for ${formatUptime(Math.round((endedAt.getTime() - connectedAt.getTime()) / 1000))}`;
  }
  if (connectedAt && isLatest && profile.connected) return "Connected now";
  if (!connectedAt && endedAt) return "Didn't connect";
  return undefined;
}

function EntryDetail({ entry, session }: { entry: LogEntry; session: LogSession }) {
  const kind = KINDS[entry.kind];
  return (
    <List.Item.Detail
      markdown={"```\n" + entry.lines.join("\n") + "\n```"}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Type">
            <List.Item.Detail.Metadata.TagList.Item text={kind.label} color={kind.color} />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label
            title="Time"
            text={entry.time ? entry.time.toLocaleString(undefined, { hour12: false }) : "Not recorded"}
          />
          {entry.lines.length > 1 && (
            <List.Item.Detail.Metadata.Label title="Lines" text={String(entry.lines.length)} />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Connection Attempt" text={sessionTitle(session)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export function ProfileLogs({ profile }: { profile: Profile }) {
  const { data: logs = "", isLoading, revalidate } = usePromise(getLogs, [profile.id]);
  const [filter, setFilter] = useCachedState<"all" | "important">("logs-filter", "all");
  const [showingDetail, setShowingDetail] = useCachedState("logs-showing-detail", true);

  const sessions = parseLogs(logs).slice(-MAX_SESSIONS).reverse();
  const visible = sessions
    .map((session) => ({
      session,
      entries: session.entries.filter((entry) => filter === "all" || isImportant(entry)).reverse(),
    }))
    .filter(({ entries }) => entries.length > 0);

  const sharedActions = (
    <>
      <Action.CopyToClipboard title="Copy All Logs" content={logs} shortcut={Keyboard.Shortcut.Common.CopyName} />
      <Action
        title={showingDetail ? "Hide Details" : "Show Details"}
        icon={Icon.Sidebar}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onAction={() => setShowingDetail((value) => !value)}
      />
      <Action
        title="Reload Logs"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
    </>
  );

  return (
    <List
      navigationTitle={`Logs: ${displayName(profile)}`}
      isLoading={isLoading}
      isShowingDetail={showingDetail && visible.length > 0}
      searchBarPlaceholder="Search logs"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Logs"
          value={filter}
          onChange={(value) => setFilter(value as "all" | "important")}
        >
          <List.Dropdown.Item title="All Events" value="all" />
          <List.Dropdown.Item title="Errors, Warnings & Connection Changes" value="important" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Document}
        title={logs.trim() ? "Nothing to show" : "No logs yet"}
        description={
          logs.trim()
            ? "No errors, warnings or connection changes. Switch to All Events to see everything."
            : "Logs show up here after this profile connects for the first time."
        }
        actions={<ActionPanel>{sharedActions}</ActionPanel>}
      />
      {visible.map(({ session, entries }, index) => (
        <List.Section
          key={session.id}
          title={sessionTitle(session)}
          subtitle={sessionOutcome(session, index === 0 && session === sessions[0], profile)}
        >
          {entries.map((entry) => (
            <List.Item
              key={entry.id}
              icon={{ source: Icon.Dot, tintColor: KINDS[entry.kind].color }}
              title={entry.title}
              keywords={entry.lines}
              accessories={entry.time ? [{ text: formatTime(entry.time) }] : undefined}
              detail={<EntryDetail entry={entry} session={session} />}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title={entry.lines.length > 1 ? "Copy Lines" : "Copy Line"}
                    content={entry.lines.join("\n")}
                  />
                  <Action.CopyToClipboard
                    title="Copy Connection Attempt Logs"
                    content={sessionText(session)}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  {sharedActions}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
