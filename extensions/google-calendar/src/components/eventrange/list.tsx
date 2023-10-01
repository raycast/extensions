import { List } from "@raycast/api";
import { useCachedPromise, showFailureToast } from "@raycast/utils";
import { calendar_v3 } from "googleapis";
import { useState } from "react";
import { getEvents, groupEventsByDay } from "@lib/api";
import { useCalendarSettings } from "@lib/settings";
import { nowDate, sameDay, dayOfWeek } from "@lib/utils";
import { getCalendarClient } from "@lib/withCalendarClient";
import { CalendarDropdown, EventListItem } from "@components/event/list";

export function EventRangeList(props: { start: Date; end?: Date }) {
  const start = props.start;
  const end = props.end;
  const { calendar } = getCalendarClient();
  const { settings } = useCalendarSettings();
  const [searchText, setSearchText] = useState<string>();
  const [selectedCalendar, setSelectedCalendar] = useState<calendar_v3.Schema$CalendarListEntry>();
  const { isLoading, data, error } = useCachedPromise(
    async (specificCalendar, start, end) => {
      return await getEvents(calendar, { specificCalendar: specificCalendar, start: start, end: end });
    },
    [selectedCalendar, start, end],
    { keepPreviousData: true }
  );
  if (error) {
    showFailureToast(error);
  }
  const days = groupEventsByDay(data);
  const today = nowDate();

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={true}
      searchBarAccessory={<CalendarDropdown onSelected={setSelectedCalendar} />}
    >
      {days?.map((d) => (
        <List.Section
          key={d.day.toLocaleDateString()}
          title={`${sameDay(today, d.day) ? "Today" : dayOfWeek(d.day)} - ${d.day.toLocaleDateString("en-US", {
            day: "2-digit",
            month: "long",
          })}`}
        >
          {d.events.map((e) => (
            <EventListItem
              key={e.event.id}
              event={e}
              isSingleCalendar={selectedCalendar ? true : false}
              settings={settings}
            />
          ))}
        </List.Section>
      ))}
      <List.EmptyView
        title={!searchText || searchText.trim().length < 0 ? "Nothing to do 😁" : "No Events found"}
        icon={"google_calendar.png"}
      />
    </List>
  );
}
