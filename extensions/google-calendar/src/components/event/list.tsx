import { List, Icon, ActionPanel } from "@raycast/api";
import { useCachedPromise, showFailureToast } from "@raycast/utils";
import { calendar_v3 } from "googleapis";
import { getCalendars, CalendarEvent, startOfEvent } from "../../lib/api";
import { getCalendarClient } from "../../lib/withCalendarClient";
import { OpenEventInBrowser, ConsoleLogAction } from "./actions";

export function CalendarDropdown(props: {
  onSelected?: (cal: calendar_v3.Schema$CalendarListEntry | undefined) => void;
}) {
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
    if (newID === "-") {
      if (props.onSelected) {
        props.onSelected(undefined);
      }
    }
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

export function EventListItem(props: { event: CalendarEvent }) {
  const event = props.event.event;
  const cal = props.event.calendar;
  const start = startOfEvent(event);
  const keywords: string[] = [];
  if (event.location) {
    keywords.push(event.location);
  }
  return (
    <List.Item
      title={event.summary || "?"}
      subtitle={event.location ?? undefined}
      icon={{ source: Icon.Calendar, tintColor: cal.backgroundColor }}
      keywords={keywords}
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
