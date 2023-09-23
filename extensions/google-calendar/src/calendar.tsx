import { Action, ActionPanel, Icon, List } from "@raycast/api";
import View from "./components/view";
import { getCalendarClient } from "./lib/withCalendarClient";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { CalendarEvent, getCalendars, getEvents, startOfEvent } from "./lib/api";

function OpenEventInBrowser(props: { event: CalendarEvent }) {
  const e = props.event;
  if (!e.event.htmlLink) {
    return null;
  }
  return <Action.OpenInBrowser url={e.event.htmlLink} />;
}

function CalendarDropdown() {
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
  return (
    <List.Dropdown isLoading={isLoading} tooltip="Calendars">
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
      icon={Icon.Calendar}
      accessories={[
        { tag: { value: cal.summary, color: cal.backgroundColor ? cal.backgroundColor : undefined } },
        { date: start, tooltip: start ? start.toLocaleDateString() : undefined },
      ]}
      actions={
        <ActionPanel>
          <OpenEventInBrowser event={props.event} />
        </ActionPanel>
      }
    />
  );
}

function RootCommand() {
  const { calendar } = getCalendarClient();
  const [searchText, setSearchText] = useState<string>("");
  const { isLoading, data, error, revalidate } = useCachedPromise(
    async (q: string) => {
      return await getEvents(calendar);
    },
    [searchText],
    { keepPreviousData: true }
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      searchBarAccessory={<CalendarDropdown />}
    >
      {data?.map((e) => (
        <EventListItem key={e.event.id} event={e} />
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
