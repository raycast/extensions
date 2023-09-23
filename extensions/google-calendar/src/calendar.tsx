import { List } from "@raycast/api";
import View from "./components/view";
import { getCalendarClient } from "./lib/withCalendarClient";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { CalendarEvent, getEvents } from "./lib/api";
import { stringToDate } from "./lib/utils";

function EventListItem(props: { event: CalendarEvent }) {
  const event = props.event.event;
  const cal = props.event.calendar;
  const datetime = stringToDate(event.start?.dateTime);
  const date = stringToDate(event.start?.date);
  return (
    <List.Item
      title={event.summary || "?"}
      accessories={[
        { tag: { value: cal.summary, color: cal.backgroundColor ? cal.backgroundColor : undefined } },
        { date: datetime ? datetime : date },
      ]}
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
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchText={searchText}>
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
