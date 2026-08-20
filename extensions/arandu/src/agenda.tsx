import { Action, ActionPanel, Color, Icon, List, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { api, type AgendaEvent } from "./lib/client";

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, tomorrow)) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

const SOURCE_ICON: Record<AgendaEvent["source"], Color> = {
  google: Color.Blue,
  apple: Color.SecondaryText,
  arandu: Color.Purple,
};

export default function Agenda() {
  const { data, isLoading, revalidate } = usePromise(api.agenda);

  const upcoming = (data?.events ?? [])
    .filter((e) => new Date(e.end).getTime() >= Date.now() || e.allDay)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const byDay = new Map<string, AgendaEvent[]>();
  for (const e of upcoming) {
    const label = dayLabel(e.start);
    if (!byDay.has(label)) byDay.set(label, []);
    byDay.get(label)!.push(e);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter events…">
      {[...byDay.entries()].map(([label, events]) => (
        <List.Section key={label} title={label}>
          {events.map((e) => (
            <List.Item
              key={e.id}
              icon={{ source: Icon.Calendar, tintColor: SOURCE_ICON[e.source] }}
              title={e.title}
              subtitle={e.workBlock ? `Block · ${e.workBlock.label}` : e.origin}
              accessories={[
                ...(e.location ? [{ icon: Icon.Pin, tooltip: e.location }] : []),
                { text: e.allDay ? "All day" : `${fmtTime(e.start)} – ${fmtTime(e.end)}` },
              ]}
              actions={
                <ActionPanel>
                  {e.url ? <Action.OpenInBrowser url={e.url} /> : null}
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={revalidate}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      {!isLoading && upcoming.length === 0 && (
        <List.EmptyView icon={Icon.Calendar} title="No upcoming events" />
      )}
    </List>
  );
}
