import { Action, ActionPanel, Icon, List, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { AuthGuard } from "./lib/auth-guard";
import { heyColorIcon } from "./lib/colors";
import { runHey } from "./lib/hey";
import type { HeyCalendar, HeyRecording, HeyRecordingsData } from "./lib/types";
import { formatDate } from "./lib/types";

type RangePreset = "today" | "week" | "month";

export default function CalendarCommand() {
  return (
    <AuthGuard>
      <CalendarsList />
    </AuthGuard>
  );
}

function CalendarsList() {
  const { isLoading, data, error, revalidate } = usePromise(async () => {
    const response = await runHey<HeyCalendar[]>(["calendars", "--json"]);
    return response.data;
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search calendars…">
      {error ? (
        <List.EmptyView
          title="Could Not Load Calendars"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : null}
      {(data ?? []).map((calendar) => (
        <List.Item
          key={calendar.id}
          title={calendarTitle(calendar)}
          subtitle={calendar.kind}
          icon={heyColorIcon(calendar.color)}
          accessories={calendar.color ? [{ text: calendar.color, icon: heyColorIcon(calendar.color) }] : undefined}
          actions={
            <ActionPanel>
              <Action.Push title="Show Events" icon={Icon.Calendar} target={<EventsList calendar={calendar} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function calendarTitle(calendar: HeyCalendar): string {
  if (calendar.name) {
    return calendar.name;
  }
  if (calendar.personal) {
    return "Personal";
  }
  return `Calendar ${calendar.id}`;
}

function EventsList({ calendar }: { calendar: HeyCalendar }) {
  const [range, setRange] = useState<RangePreset>("month");
  const { startsOn, endsOn } = useMemo(() => dateRange(range), [range]);

  const { isLoading, data, error, revalidate } = usePromise(
    async () => {
      const response = await runHey<HeyRecordingsData>([
        "recordings",
        String(calendar.id),
        "--starts-on",
        startsOn,
        "--ends-on",
        endsOn,
        "--json",
      ]);
      return response.data;
    },
    [calendar.id, startsOn, endsOn],
    { keepPreviousData: true },
  );

  const events = data?.["Calendar::Event"] ?? [];

  return (
    <List
      isLoading={isLoading}
      navigationTitle={calendarTitle(calendar)}
      searchBarPlaceholder="Search events…"
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Date Range" onChange={(value) => setRange(value as RangePreset)}>
          <List.Dropdown.Item title="Today" value="today" />
          <List.Dropdown.Item title="This Week" value="week" />
          <List.Dropdown.Item title="Next 30 Days" value="month" />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          title="Could Not Load Events"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : null}
      {events.length === 0 && !isLoading ? (
        <List.EmptyView title="No Events" description={`No events between ${startsOn} and ${endsOn}.`} />
      ) : null}
      {events.map((event) => (
        <EventItem key={event.id} event={event} calendarColor={calendar.color} />
      ))}
    </List>
  );
}

function EventItem({ event, calendarColor }: { event: HeyRecording; calendarColor?: string }) {
  const tintColor = event.color ?? calendarColor;
  const timeLabel = event.all_day ? "All day" : `${formatDate(event.starts_at)} – ${formatDate(event.ends_at)}`;

  return (
    <List.Item
      title={event.title}
      subtitle={timeLabel}
      icon={heyColorIcon(tintColor)}
      actions={
        <ActionPanel>
          {event.app_url ? (
            <Action title="Open in HEY" icon={Icon.Globe} onAction={() => open(event.app_url!)} />
          ) : null}
          <Action.CopyToClipboard title="Copy Title" content={event.title} />
        </ActionPanel>
      }
    />
  );
}

function dateRange(preset: RangePreset): { startsOn: string; endsOn: string } {
  const today = new Date();
  const format = (date: Date) => date.toISOString().slice(0, 10);

  if (preset === "today") {
    const day = format(today);
    return { startsOn: day, endsOn: day };
  }

  if (preset === "week") {
    const end = new Date(today);
    end.setDate(end.getDate() + 7);
    return { startsOn: format(today), endsOn: format(end) };
  }

  const end = new Date(today);
  end.setDate(end.getDate() + 30);
  return { startsOn: format(today), endsOn: format(end) };
}
