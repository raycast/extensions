import { Action, ActionPanel, Alert, Color, Icon, Keyboard, List, confirmAlert, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedPromise, withAccessToken } from "@raycast/utils";
import {
  TimeEntry,
  continueInput,
  deleteEntry,
  elapsedSeconds,
  formatDuration,
  listEntries,
  refreshMenuBar,
  startTimer,
  stopEntry,
  timerUrl,
  timevoice,
} from "./api";

function RecentEntries() {
  const {
    data: entries,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => (await listEntries(14)).filter((entry) => new Date(entry.started_at) <= new Date()),
    [],
    { initialData: [] },
  );
  const { data: url } = useCachedPromise(timerUrl);

  async function run(title: string, doneTitle: string, action: () => Promise<unknown>) {
    const toast = await showToast({ style: Toast.Style.Animated, title });
    try {
      await action();
      await refreshMenuBar();
      toast.style = Toast.Style.Success;
      toast.title = doneTitle;
      revalidate();
    } catch (error) {
      toast.hide();
      await showFailureToast(error);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter by description, project or tag">
      {groupByDay(entries).map(([day, dayEntries]) => (
        <List.Section
          key={day}
          title={day}
          subtitle={formatDuration(
            dayEntries.reduce((sum, entry) => sum + elapsedSeconds(entry), 0),
            false,
          )}
        >
          {dayEntries.map((entry) => (
            <List.Item
              key={entry.id}
              icon={{ source: Icon.CircleFilled, tintColor: entry.project?.color ?? Color.SecondaryText }}
              title={entry.description || "No description"}
              subtitle={entry.project?.name}
              keywords={[entry.project?.name ?? "", ...entry.tags.map((tag) => tag.name)]}
              accessories={[
                ...entry.tags.map((tag) => ({ tag: tag.name })),
                ...(entry.billable ? [{ icon: Icon.Coins, tooltip: "Billable" }] : []),
                { text: timeRange(entry) },
                entry.ended_at
                  ? { text: formatDuration(elapsedSeconds(entry)) }
                  : { tag: { value: formatDuration(elapsedSeconds(entry)), color: Color.Green }, tooltip: "Running" },
              ]}
              actions={
                <ActionPanel>
                  {entry.ended_at ? (
                    <Action
                      title="Continue Timer"
                      icon={Icon.Play}
                      onAction={() => run("Starting timer…", "Timer started", () => startTimer(continueInput(entry)))}
                    />
                  ) : (
                    <Action
                      title="Stop Timer"
                      icon={Icon.Stop}
                      onAction={() => run("Stopping timer…", "Timer stopped", () => stopEntry(entry.id))}
                    />
                  )}
                  {url && <Action.OpenInBrowser title="Open in Timevoice" url={url} />}
                  {entry.description && (
                    <Action.CopyToClipboard
                      title="Copy Description"
                      content={entry.description}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                  )}
                  <Action
                    title="Delete Entry"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={async () => {
                      const confirmed = await confirmAlert({
                        title: "Delete this time entry?",
                        message: entry.description ?? undefined,
                        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                      });
                      if (confirmed) await run("Deleting entry…", "Entry deleted", () => deleteEntry(entry.id));
                    }}
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
        </List.Section>
      ))}
      {!isLoading && <List.EmptyView icon={Icon.Clock} title="No time entries in the last two weeks" />}
    </List>
  );
}

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" });

function timeRange(entry: TimeEntry): string {
  const start = timeFormat.format(new Date(entry.started_at));
  return entry.ended_at ? `${start} – ${timeFormat.format(new Date(entry.ended_at))}` : `${start} – now`;
}

function dayLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return dayFormat.format(date);
}

function groupByDay(entries: TimeEntry[]): [string, TimeEntry[]][] {
  const groups = new Map<string, TimeEntry[]>();
  for (const entry of entries) {
    const label = dayLabel(new Date(entry.started_at));
    const group = groups.get(label);
    if (group) group.push(entry);
    else groups.set(label, [entry]);
  }
  return [...groups];
}

export default withAccessToken(timevoice)(RecentEntries);
