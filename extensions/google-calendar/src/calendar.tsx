import { Action, ActionPanel, Icon, List } from "@raycast/api";
import View from "./components/view";
import { getCalendarClient } from "./lib/withCalendarClient";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { CalendarEvent, getCalendars, getEvents, groupEventsByDay, startOfEvent } from "./lib/api";
import { calendar_v3 } from "@googleapis/calendar";

function OpenEventInBrowser(props: { event: CalendarEvent }) {
  const e = props.event;
  if (!e.event.htmlLink) {
    return null;
  }
  return <Action.OpenInBrowser url={e.event.htmlLink} />;
}

function ConsoleLogAction(props: { event: CalendarEvent }) {
  return <Action title="Print to Console" onAction={() => console.log(props.event)} />;
}

function CalendarDropdown(props: { onSelected?: (cal: calendar_v3.Schema$CalendarListEntry) => void }) {
  const { calendar } = getCalendarClient();
  const { isLoading, data, error } = useCachedPromise(
    async () => {
      return await getCalendars(calendar);
    },
    [],
    { keepPreviousData: true }
  );
  if (error) {
    showFailureToast(error);
  }
  const onSelection = (newID: string) => {
    const found = data?.data.items?.find((c) => c.id === newID);
    if (found) {
      if (props.onSelected) {
        props.onSelected(found);
      }
    }
  };
  return (
    <List.Dropdown isLoading={isLoading} tooltip="Calendars" onChange={onSelection}>
      <List.Dropdown.Item title="All" value="-" />
      {data?.data.items?.map((c) => (
        <List.Dropdown.Item title={c.summary || "?"} value={c.id || ""} key={c.id} />
      ))}
    </List.Dropdown>
  );
}

function EventListItem(props: { event: CalendarEvent }) {
  const event = props.event.event;
  const cal = props.event.calendar;
  const start = startOfEvent(event);
  return (
    <List.Item
      title={event.summary || "?"}
      subtitle={event.location ?? undefined}
      icon={Icon.Calendar}
      accessories={[
        { tag: { value: cal.summary, color: cal.backgroundColor ? cal.backgroundColor : undefined } },
        { date: start, tooltip: start ? start.toLocaleDateString() : undefined },
      ]}
      actions={
        <ActionPanel>
          <OpenEventInBrowser event={props.event} />
          <ConsoleLogAction event={props.event} />
        </ActionPanel>
      }
    />
  );
}

function RootCommand() {
  const { calendar } = getCalendarClient();
  const [searchText, setSearchText] = useState<string>("");
  const [selectedCalendar, setSelectedCalendar] = useState<calendar_v3.Schema$CalendarListEntry>();
  const { isLoading, data, error } = useCachedPromise(
    async (q: string, specificCalendar) => {
      return await getEvents(calendar, { query: q, specificCalendar: specificCalendar });
    },
    [searchText, selectedCalendar],
    { keepPreviousData: true }
  );
  if (error) {
    showFailureToast(error);
  }
  const days = groupEventsByDay(data);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      searchBarAccessory={<CalendarDropdown onSelected={setSelectedCalendar} />}
    >
      {days?.map((d) => (
        <List.Section key={d.day.toLocaleDateString()} title={d.day.toLocaleDateString()}>
          {d.events.map((e) => (
            <EventListItem key={e.event.id} event={e} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <RootCommand />
    </View>
  );
}
