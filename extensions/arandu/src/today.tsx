import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { api, type TodayResponse } from "./lib/client";

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PRIORITY_COLOR: Record<string, Color> = {
  urgent: Color.Red,
  high: Color.Orange,
  med: Color.Blue,
  low: Color.SecondaryText,
};

function priorityAccessory(priority?: string) {
  if (!priority) return [];
  return [
    {
      tag: {
        value: priority,
        color: PRIORITY_COLOR[priority] ?? Color.SecondaryText,
      },
    },
  ];
}

export default function Today() {
  const { data, isLoading, revalidate } = usePromise(api.today);

  const completeTask = async (item: {
    id: string;
    source: string;
    title: string;
  }) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Completing…",
    });
    try {
      if (item.source === "arandu") await api.completeTask(item.id);
      else await api.completeJiraFromToday(item.id);
      toast.style = Toast.Style.Success;
      toast.title = "Completed";
      toast.message = item.title;
      revalidate();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to complete";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  };

  const completeReminder = async (id: string, title: string) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Completing…",
    });
    try {
      await api.completeReminder(id);
      toast.style = Toast.Style.Success;
      toast.title = "Reminder completed";
      toast.message = title;
      revalidate();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to complete";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  };

  const refreshAction = (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      onAction={revalidate}
      shortcut={Keyboard.Shortcut.Common.Refresh}
    />
  );

  const taskActions = (item: {
    id: string;
    source: string;
    title: string;
    url: string | null;
  }) => (
    <ActionPanel>
      <Action
        title="Complete Task"
        icon={Icon.CheckCircle}
        onAction={() => void completeTask(item)}
      />
      {item.url ? <Action.OpenInBrowser url={item.url} /> : null}
      {refreshAction}
    </ActionPanel>
  );

  const d: TodayResponse | undefined = data;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter today's plan…">
      {d && d.overdue.length > 0 && (
        <List.Section title="Overdue">
          {d.overdue.map((t) => (
            <List.Item
              key={`overdue-${t.id}`}
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
              title={t.title}
              subtitle={t.origin}
              accessories={[
                ...priorityAccessory(t.priority),
                { date: new Date(t.dueAt), tooltip: "Original due date" },
              ]}
              actions={taskActions(t)}
            />
          ))}
        </List.Section>
      )}

      {d && d.allDayEvents.length > 0 && (
        <List.Section title="All Day">
          {d.allDayEvents.map((e) => (
            <List.Item
              key={`allday-${e.id}`}
              icon={{ source: Icon.Calendar, tintColor: Color.Purple }}
              title={e.title}
              subtitle={e.origin}
              actions={
                <ActionPanel>
                  {e.url ? <Action.OpenInBrowser url={e.url} /> : null}
                  {refreshAction}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {d && d.events.length > 0 && (
        <List.Section title="Events">
          {d.events.map((e) => (
            <List.Item
              key={`event-${e.id}`}
              icon={{ source: Icon.Calendar, tintColor: Color.Purple }}
              title={e.title}
              subtitle={e.workBlock ? `Block · ${e.workBlock.label}` : e.origin}
              accessories={[
                { text: `${fmtTime(e.start)} – ${fmtTime(e.end)}` },
              ]}
              actions={
                <ActionPanel>
                  {e.url ? <Action.OpenInBrowser url={e.url} /> : null}
                  {refreshAction}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {d && d.scheduled.length > 0 && (
        <List.Section title="Scheduled Tasks">
          {d.scheduled.map((s) => (
            <List.Item
              key={`sched-${s.candidate.id}`}
              icon={{ source: Icon.Circle, tintColor: Color.Blue }}
              title={s.candidate.title}
              subtitle={s.candidate.origin}
              accessories={[
                ...priorityAccessory(s.candidate.priority),
                { text: fmtTime(s.start) },
              ]}
              actions={taskActions(s.candidate)}
            />
          ))}
        </List.Section>
      )}

      {d && d.reminders.length > 0 && (
        <List.Section title="Reminders">
          {d.reminders.map((r) => (
            <List.Item
              key={`rem-${r.id}`}
              icon={
                r.done
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : { source: Icon.Bell, tintColor: Color.Yellow }
              }
              title={r.title}
              accessories={[
                ...(r.recurring
                  ? [{ icon: Icon.Repeat, tooltip: "Recurring" }]
                  : []),
                { text: fmtTime(r.fireAt) },
              ]}
              actions={
                <ActionPanel>
                  {!r.done ? (
                    <Action
                      title="Complete Reminder"
                      icon={Icon.CheckCircle}
                      onAction={() => void completeReminder(r.id, r.title)}
                    />
                  ) : null}
                  {refreshAction}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {d && d.habitsToday.length > 0 && (
        <List.Section title="Habits">
          {d.habitsToday.map((h) => (
            <List.Item
              key={`habit-${h.id}`}
              icon={
                h.doneToday
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : { source: Icon.Circle, tintColor: Color.SecondaryText }
              }
              title={h.name}
              actions={
                <ActionPanel>
                  <Action
                    title={h.doneToday ? "Uncheck Habit" : "Check Habit"}
                    icon={h.doneToday ? Icon.Circle : Icon.CheckCircle}
                    onAction={async () => {
                      try {
                        await api.checkHabit(h.id, !h.doneToday);
                        revalidate();
                      } catch (err) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to update habit",
                          message:
                            err instanceof Error ? err.message : String(err),
                        });
                      }
                    }}
                  />
                  {refreshAction}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {d && d.completedToday.length > 0 && (
        <List.Section title="Completed Today">
          {d.completedToday.map((t) => (
            <List.Item
              key={`done-${t.id}`}
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
              title={t.title}
              subtitle={t.origin}
              accessories={[{ text: fmtTime(t.completedAt) }]}
              actions={
                <ActionPanel>
                  {t.url ? <Action.OpenInBrowser url={t.url} /> : null}
                  {refreshAction}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {d &&
        d.overdue.length === 0 &&
        d.events.length === 0 &&
        d.allDayEvents.length === 0 &&
        d.scheduled.length === 0 &&
        d.reminders.length === 0 &&
        d.habitsToday.length === 0 &&
        d.completedToday.length === 0 && (
          <List.EmptyView icon={Icon.Sun} title="Nothing planned for today" />
        )}
    </List>
  );
}
