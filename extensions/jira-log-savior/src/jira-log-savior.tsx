import { Action, ActionPanel, Color, Grid, Icon, List, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { dateKey, duration, monthStart, progress, shiftDay, targetSeconds } from "./calendar";
import { loadMonth, siteOrigin, type CalendarData, type JiraSettings, type Task } from "./jira";

const monthLabel = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const dayLabel = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const weekday = new Intl.DateTimeFormat(undefined, { weekday: "short" });

function DayView({ date, tasks, origin }: { date: Date; tasks: Task[]; origin: string }) {
  const total = tasks.reduce((sum, task) => sum + task.seconds, 0);
  const status = `${duration(total)} logged · ${progress(total)} · 7h 30m goal`;
  return (
    <List navigationTitle={dayLabel.format(date)} searchBarPlaceholder="Filter tasks">
      <List.EmptyView icon={Icon.Calendar} title="No worklogs for this day" description={status} />
      <List.Section title="Logged tasks" subtitle={status}>
        {tasks.map((task) => (
          <List.Item
            key={task.key}
            title={task.summary}
            subtitle={task.key}
            accessories={[{ text: duration(task.seconds) }]}
            actions={<ActionPanel><Action.OpenInBrowser title="Open Issue in Jira" url={`${origin}/browse/${encodeURIComponent(task.key)}`} /></ActionPanel>}
          />
        ))}
      </List.Section>
    </List>
  );
}

type Result = { key: string; data: CalendarData } | { key: string; error: string };

export default function Command() {
  const { site, email, token } = getPreferenceValues<JiraSettings>();
  const [month, setMonth] = useState(() => monthStart(new Date()));
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Result>();
  const today = new Date();
  const key = `${dateKey(month)}:${revision}`;
  const current = result?.key === key ? result : undefined;
  const data = current && "data" in current ? current.data : undefined;
  const error = current && "error" in current ? current.error : undefined;

  useEffect(() => {
    const controller = new AbortController();
    loadMonth({ site, email, token }, month, controller.signal).then(
      (data) => { if (!controller.signal.aborted) setResult({ key, data }); },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({ key, error: error instanceof Error ? error.message : "Could not load Jira worklogs." });
          controller.abort();
        }
      },
    );
    return () => controller.abort();
  }, [site, email, token, month, key]);

  function calendarActions(date?: Date, tasks: Task[] = []) {
    return (
      <ActionPanel>
        {date && data && <Action.Push title="View Logged Tasks" icon={Icon.List} target={<DayView date={date} tasks={tasks} origin={siteOrigin(site)} />} />}
        <Action title="Previous Month" icon={Icon.ArrowLeft} shortcut={{ modifiers: ["cmd", "shift"], key: "arrowLeft" }} onAction={() => setMonth((value) => monthStart(value, -1))} />
        <Action title="Next Month" icon={Icon.ArrowRight} shortcut={{ modifiers: ["cmd", "shift"], key: "arrowRight" }} onAction={() => setMonth((value) => monthStart(value, 1))} />
        <Action title="Go to Current Month" icon={Icon.Calendar} shortcut={{ modifiers: ["cmd"], key: "t" }} onAction={() => {
          setMonth((value) => dateKey(value) === dateKey(monthStart(new Date())) ? value : monthStart(new Date()));
        }} />
        <Action title="Refresh Worklogs" icon={Icon.ArrowClockwise} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={() => setRevision((value) => value + 1)} />
        <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </ActionPanel>
    );
  }

  const first = shiftDay(month, -((month.getDay() + 6) % 7));
  const end = monthStart(month, 1);
  const dates: Date[] = [];
  for (let date = first; date < end || dates.length % 7 !== 0; date = shiftDay(date, 1)) {
    dates.push(date);
  }

  return (
    <Grid
      columns={7}
      aspectRatio="16/9"
      fit={Grid.Fit.Contain}
      filtering={false}
      isLoading={!current}
      navigationTitle={`Jira Log Savior · ${monthLabel.format(month)}`}
      searchBarPlaceholder="⌘⇧← / ⌘⇧→ to switch months"
      selectedItemId={dateKey(today).slice(0, 7) === dateKey(month).slice(0, 7) ? dateKey(today) : dateKey(month)}
    >
      {error ? (
        <Grid.EmptyView title="Could not load Jira worklogs" description={error} actions={calendarActions()} />
      ) : (
        <Grid.Section title={monthLabel.format(month)} subtitle="7h 30m daily goal">
          {dates.map((date) => {
            const id = dateKey(date);
            const inMonth = date >= month && date < end;
            const isToday = id === dateKey(today);
            const tasks = data?.get(id) ?? [];
            const total = tasks.reduce((sum, task) => sum + task.seconds, 0);
            const tintColor = !inMonth || !data ? Color.SecondaryText : total >= targetSeconds ? Color.Green : total ? Color.Orange : Color.SecondaryText;
            const subtitle = inMonth && data ? `${duration(total)} · ${progress(total)}` : undefined;
            return <Grid.Item
              key={id}
              id={id}
              title={`${weekday.format(date)} ${date.getDate()}${isToday ? " · Today" : ""}`}
              subtitle={subtitle}
              content={{ source: inMonth ? Icon.Calendar : Icon.Minus, tintColor }}
              actions={calendarActions(inMonth ? date : undefined, tasks)}
            />;
          })}
        </Grid.Section>
      )}
    </Grid>
  );
}
