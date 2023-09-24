import { List, Icon, ActionPanel, Image } from "@raycast/api";
import { useCachedPromise, showFailureToast } from "@raycast/utils";
import { calendar_v3 } from "googleapis";
import { getCalendars, CalendarEvent, startOfEvent, GooPreferences } from "../../lib/api";
import { getCalendarClient } from "../../lib/withCalendarClient";
import { OpenEventInBrowser, ConsoleLogAction, CopyEventToClipboardAction } from "./actions";

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
  const gooPrefs = event.gadget?.preferences as GooPreferences | undefined;
  const contactPhotoLink = gooPrefs?.["goo.contactsPhotoUrl"];
  const isBirthday = gooPrefs?.["goo.contactsEventType"] === "BIRTHDAY";
  return (
    <List.Item
      title={event.summary || "?"}
      subtitle={event.location ?? undefined}
      icon={isBirthday ? "🎂" : { source: Icon.Calendar, tintColor: cal.backgroundColor }}
      keywords={keywords}
      accessories={[
        { icon: event.gadget?.iconLink },
        { icon: contactPhotoLink ? { source: contactPhotoLink, mask: Image.Mask.Circle } : undefined },
        { tag: { value: cal.summary, color: cal.backgroundColor ? cal.backgroundColor : undefined } },
        { date: start, tooltip: start ? start.toLocaleDateString() : undefined },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenEventInBrowser event={props.event} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Debug">
            <ConsoleLogAction event={props.event} />
            <CopyEventToClipboardAction event={props.event} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
