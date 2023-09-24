import { List } from "@raycast/api";
import View from "./components/view";
import { getCalendarClient } from "./lib/withCalendarClient";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getEvents, groupEventsByDay } from "./lib/api";
import { calendar_v3 } from "@googleapis/calendar";
import { CalendarDropdown, EventListItem } from "./components/event/list";
import { dayOfWeek, nowDate, sameDay } from "./lib/utils";

function RootCommand() {
  const { calendar } = getCalendarClient();
  const [searchText, setSearchText] = useState<string>("");
  const [selectedCalendar, setSelectedCalendar] = useState<calendar_v3.Schema$CalendarListEntry>();
  const { isLoading, data, error } = useCachedPromise(
    async (q: string, specificCalendar) => {
      return await getEvents(calendar, { query: q, specificCalendar: specificCalendar, start: nowDate(), end: null });
    },
    [searchText, selectedCalendar],
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
      onSearchTextChange={setSearchText}
      throttle
      searchText={searchText}
      searchBarAccessory={<CalendarDropdown onSelected={setSelectedCalendar} />}
    >
      {days?.map((d) => (
        <List.Section
          key={d.day.toLocaleDateString()}
          title={`${sameDay(today, d.day) ? "Today" : dayOfWeek(d.day)} - ${d.day.toLocaleDateString()}`}
        >
          {d.events.map((e) => (
            <EventListItem key={e.event.id} event={e} isSingleCalendar={selectedCalendar ? true : false} />
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
