import "./initSentry";

import { List } from "@raycast/api";
import { addDays, differenceInHours, endOfDay, isAfter, isBefore, isWithinInterval, startOfDay } from "date-fns";
import { useMemo, useState } from "react";
import { MyCalendarEventListSection } from "./components/MyCalendarEventListSection";
import { withRAIErrorBoundary } from "./components/RAIErrorBoundary";
import { useEvents } from "./hooks/useEvent";
import { Event } from "./types/event";

type EventSection = { section: string; sectionTitle: string; events: Event[] };

function Command() {
  const [searchText, setSearchText] = useState("");
  const now = new Date();

  const { events, isLoading } = useEvents({
    start: startOfDay(now),
    end: addDays(now, 7),
  });

  const eventSections = useMemo<EventSection[]>(() => {
    if (!events) return [];

    const today = startOfDay(now);
    const tomorrow = startOfDay(addDays(now, 1));

    const eventSectionsUnfiltered: EventSection[] = [
      {
        section: "NOW",
        sectionTitle: "Now",
        events: events
          .filter((event) => {
            const start = new Date(event.eventStart);
            const end = new Date(event.eventEnd);
            return isWithinInterval(now, { start, end });
          })
          .filter((event) => {
            return !(differenceInHours(new Date(event.eventEnd), new Date(event.eventStart)) >= 24);
          }),
      },
      {
        section: "TODAY",
        sectionTitle: "Today",
        events: events
          .filter((event) => {
            const start = new Date(event.eventStart);
            return isAfter(start, now) && isBefore(start, endOfDay(now));
          })
          .filter((event) => {
            return !(differenceInHours(new Date(event.eventEnd), new Date(event.eventStart)) >= 24);
          }),
      },
      {
        section: "EARLIER_TODAY",
        sectionTitle: "Earlier today",
        events: events
          .filter((event) => {
            const end = new Date(event.eventEnd);
            const start = new Date(event.eventStart);
            return isAfter(start, today) && isBefore(end, now);
          })
          .filter((event) => {
            return !(differenceInHours(new Date(event.eventEnd), new Date(event.eventStart)) >= 24);
          }),
      },
      {
        section: "TOMORROW",
        sectionTitle: "Tomorrow",
        events: events
          .filter((event) => {
            const start = new Date(event.eventStart);
            return isWithinInterval(start, { start: tomorrow, end: endOfDay(tomorrow) });
          })
          .filter((event) => {
            return !(differenceInHours(new Date(event.eventEnd), new Date(event.eventStart)) >= 24);
          }),
      },
    ];

    return eventSectionsUnfiltered.filter((event) => event.events.length > 0);
  }, [events]);

  return (
    <List
      filtering={true}
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="My Calendar"
      searchBarPlaceholder="Search your events"
    >
      {eventSections.map((section) => (
        <MyCalendarEventListSection key={section.section} sectionTitle={section.sectionTitle} events={section.events} />
      ))}
    </List>
  );
}

export default withRAIErrorBoundary(Command);
