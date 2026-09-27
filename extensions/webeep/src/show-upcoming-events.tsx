import { Action, ActionPanel, Color, Icon, List, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { AuthEmptyView, isAuthError, showError } from "./components/errors";
import { CalendarEvent, fetchUpcomingEvents } from "./lib/calendar";
import { getLanguage } from "./lib/prefs";

const DAY = 24 * 60 * 60 * 1000;

function bucket(event: CalendarEvent, now: Date): string {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = event.start.getTime() - startOfToday;
  if (diff < 0) return "Overdue";
  if (diff < DAY) return "Today";
  if (diff < 2 * DAY) return "Tomorrow";
  if (diff < 7 * DAY) return "This Week";
  if (diff < 30 * DAY) return "This Month";
  return "Later";
}

const ORDER = ["Overdue", "Today", "Tomorrow", "This Week", "This Month", "Later"];

function markdownFor(event: CalendarEvent): string {
  const when = event.end
    ? `${event.start.toLocaleString()} – ${event.end.toLocaleTimeString()}`
    : event.start.toLocaleString();
  return [`## ${event.name}`, `**${when}**`, event.courseName ?? "", event.description].filter(Boolean).join("\n\n");
}

export default function ShowUpcomingEvents() {
  const lang = getLanguage();
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchUpcomingEvents, [lang], { onError: showError });
  const now = new Date();
  const groups = new Map<string, CalendarEvent[]>();
  for (const event of data ?? []) {
    const key = event.overdue ? "Overdue" : bucket(event, now);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search upcoming events and deadlines…">
      {error && isAuthError(error) ? (
        <AuthEmptyView error={error} />
      ) : data && data.length === 0 ? (
        <List.EmptyView
          icon={Icon.Calendar}
          title="Nothing coming up"
          description="No upcoming events or deadlines on your WeBeep calendar"
        />
      ) : (
        ORDER.filter((key) => groups.has(key)).map((key) => (
          <List.Section key={key} title={key}>
            {(groups.get(key) ?? []).map((event) => (
              <List.Item
                key={event.id}
                title={event.name}
                subtitle={event.courseName}
                icon={
                  event.overdue
                    ? { source: Icon.ExclamationMark, tintColor: Color.Red }
                    : event.moduleName === "assign"
                      ? Icon.Pencil
                      : Icon.Calendar
                }
                keywords={[event.courseName ?? "", event.eventType, event.moduleName ?? ""]}
                accessories={[{ date: event.start }]}
                detail={<List.Item.Detail markdown={markdownFor(event)} />}
                actions={
                  <ActionPanel>
                    {event.url ? <Action.OpenInBrowser title="Open in Browser" url={event.url} /> : null}
                    {event.actionUrl && event.actionName ? (
                      <Action.OpenInBrowser title={event.actionName} icon={Icon.ArrowRight} url={event.actionUrl} />
                    ) : null}
                    {event.url ? (
                      <Action.CopyToClipboard
                        title="Copy Link"
                        content={event.url}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                    ) : null}
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
        ))
      )}
    </List>
  );
}
