import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useMemo, useState } from "react";
import { SparkNotInstalled } from "./components/states";
import {
  getSparkPath,
  isSparkInstalled,
  parseEvents,
  type CalendarEvent,
} from "./lib/spark";

const RANGES = [
  { title: "Today", value: "--today" },
  { title: "Tomorrow", value: "--tomorrow" },
  { title: "This Week", value: "--week" },
];

export default function Calendar() {
  if (!isSparkInstalled()) return <SparkNotInstalled />;
  return <CalendarView />;
}

function CalendarView() {
  const [range, setRange] = useState("--week");

  const { data, isLoading, error } = useExec(
    getSparkPath(),
    ["events", range],
    {
      keepPreviousData: true,
    },
  );

  if (error) showFailureToast(error, { title: "Couldn't load calendar" });

  const events = useMemo(() => (data ? parseEvents(data) : []), [data]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const list = map.get(e.day) ?? [];
      list.push(e);
      map.set(e.day, list);
    }
    return [...map.entries()];
  }, [events]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={events.length > 0}
      searchBarPlaceholder="Filter events…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Range"
          value={range}
          onChange={setRange}
          storeValue
        >
          {RANGES.map((r) => (
            <List.Dropdown.Item key={r.value} title={r.title} value={r.value} />
          ))}
        </List.Dropdown>
      }
    >
      {!isLoading && events.length === 0 ? (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No events"
          description="Nothing scheduled in this range."
        />
      ) : (
        byDay.map(([day, dayEvents]) => (
          <List.Section key={day} title={day}>
            {dayEvents.map((e, i) => (
              <List.Item
                key={`${day}-${i}`}
                icon={Icon.Calendar}
                title={e.title || "(untitled)"}
                accessories={[{ text: e.time }]}
                detail={<List.Item.Detail markdown={renderEvent(e)} />}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Event"
                      content={`${e.title}\n${e.time}\n${e.details}`}
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

function renderEvent(e: CalendarEvent): string {
  return [
    `## ${e.title || "(untitled)"}`,
    `**${e.day} · ${e.time}**`,
    "",
    e.details,
  ].join("\n");
}
