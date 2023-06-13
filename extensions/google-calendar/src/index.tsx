import { Detail, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchEvents } from "./api/events";
import * as google from "./oauth/google";
import { withGoogleAuth } from "./components/withGoogleAuth";
import { currentMonth, eventsDateRange } from "./helpers/date";
import { CalendarEvent } from "./types/event";
import Day from "./components/dateSection";

function Schedule() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const month = currentMonth();

  useEffect(() => {
    (async () => {
      try {
        const fetchedItems = await fetchEvents();
        setEvents(fetchedItems.items);
        setIsLoading(false);
        showToast({ style: Toast.Style.Success, title: "Showing this week's events!" });
      } catch (error) {
        console.error(error);
        setIsLoading(false);
        showToast({ style: Toast.Style.Failure, title: String(error) });
      }
    })();
  }, [google]);

  if (isLoading) {
    return <Detail isLoading={isLoading} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter by meeting title">
      {eventsDateRange().map((date) => {
        return <Day key={`${month}-${date}`} month={month} date={date} events={events} />;
      })}
    </List>
  );
}

export default function MySchedule() {
  return withGoogleAuth(<Schedule />);
}
