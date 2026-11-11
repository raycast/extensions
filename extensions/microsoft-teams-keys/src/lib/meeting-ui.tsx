import { Action, ActionPanel, Color, Icon, Keyboard, List, closeMainWindow, open, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { CalendarAccessError, Meeting } from "./calendar";
import { openInTeams } from "./teams";

export function time(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function dayTitle(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

/** Closes Raycast and opens the meeting in the Teams app. */
export async function joinLink(link: string, title: string): Promise<void> {
  await closeMainWindow();
  try {
    await openInTeams(link);
    await showHUD(`Joining ${title}`);
  } catch (error) {
    await showFailureToast(error, { title: "Could not join the meeting" });
  }
}

export function MeetingItem(props: { meeting: Meeting; now: Date; onReload: () => void }) {
  const { meeting, now, onReload } = props;
  const running = meeting.start <= now && meeting.end > now;
  const minutes = Math.round((meeting.start.getTime() - now.getTime()) / 60_000);
  const soon = !running && minutes >= 0 && minutes <= 15;
  return (
    <List.Item
      title={meeting.title}
      subtitle={meeting.allDay ? "All day" : `${time(meeting.start)} – ${time(meeting.end)}`}
      icon={{ source: Icon.Video, tintColor: running ? Color.Green : soon ? Color.Orange : undefined }}
      keywords={[meeting.calendar]}
      accessories={[
        ...(running ? [{ tag: { value: "Now", color: Color.Green } }] : []),
        ...(soon ? [{ tag: { value: minutes === 0 ? "Starting" : `In ${minutes} min`, color: Color.Orange } }] : []),
        { text: meeting.calendar },
      ]}
      actions={
        <ActionPanel>
          <Action title="Join Meeting" icon={Icon.Video} onAction={() => joinLink(meeting.link, meeting.title)} />
          <Action.CopyToClipboard title="Copy Meeting Link" content={meeting.link} />
          <Action.OpenInBrowser title="Open in Browser" url={meeting.link} />
          <Action
            title="Reload"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onReload}
          />
        </ActionPanel>
      }
    />
  );
}

/** Empty view for a calendar error, or for no meetings at all. */
export function MeetingsEmptyView(props: { error?: Error; emptyText: string; onReload: () => void }) {
  const { error, emptyText, onReload } = props;
  if (!error) return <List.EmptyView icon={Icon.Calendar} title="No Teams meetings" description={emptyText} />;
  return (
    <List.EmptyView
      icon={Icon.Calendar}
      title={error instanceof CalendarAccessError ? "No access to your calendars" : "Could not read your calendars"}
      description={error.message}
      actions={
        <ActionPanel>
          <Action
            title="Open Privacy Settings"
            icon={Icon.Lock}
            onAction={() => open("x-apple.systempreferences:com.apple.preference.security?Privacy_Calendars")}
          />
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onReload} />
        </ActionPanel>
      }
    />
  );
}
