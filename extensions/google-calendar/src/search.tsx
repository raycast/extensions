import { List } from "@raycast/api";
import View from "./components/view";
import { getCalendarClient } from "./lib/withCalendarClient";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getEvents, groupEventsByDay } from "./lib/api";
import { calendar_v3 } from "@googleapis/calendar";
import { CalendarDropdown, EventListItem } from "./components/event/list";
import { dayOfWeek, nowDate, sameDay } from "./lib/utils";
import { useCalendarSettings } from "./lib/settings";

function RootCommand() {
  const { calendar } = getCalendarClient();
  const { settings } = useCalendarSettings();
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
        title={!searchText || searchText.trim().length < 0 ? "Nothing to do" : "No Events found"}
        icon={"google_calendar.png"}
      />
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
