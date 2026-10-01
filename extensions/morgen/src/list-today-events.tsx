import { List, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  EventWithCalendar,
  formatTime,
  computeDuration,
  getConferenceUrl,
  fetchEventsWithErrorHandling,
} from "./utils";
import { EventActions } from "./event-actions";

export default function ListTodayEvents() {
  const [events, setEvents] = useState<EventWithCalendar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    async function fetchEvents() {
      const now = new Date();
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const { events, error } = await fetchEventsWithErrorHandling(
        startOfDay.toISOString(),
        endOfDay.toISOString(),
      );
      setEvents(events);
      setHasError(error);
      setIsLoading(false);
    }
    fetchEvents();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter today's events...">
      {events.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={hasError ? Icon.ExclamationMark : Icon.Calendar}
          title={hasError ? "Unable to Load Events" : "No Events Today"}
          description={
            hasError
              ? "Calendar availability is unknown. Check the error and try again later."
              : "Enjoy your free day!"
          }
        />
      ) : (
        events.map((event, index) => {
          const time = event.showWithoutTime
            ? "All day"
            : formatTime(event.start, event.timeZone);
          const duration = computeDuration(
            event.start,
            event.end,
            event.duration,
            event.timeZone,
          );
          const accessories = [
            ...(getConferenceUrl(event) ? [{ icon: Icon.Video }] : []),
            { text: event.calendarName },
            ...(duration ? [{ text: duration }] : []),
          ];

          return (
            <List.Item
              key={event.id ?? `${index}`}
              icon={Icon.Calendar}
              title={event.title || "(No title)"}
              subtitle={time}
              accessories={accessories}
              actions={<EventActions event={event} />}
            />
          );
        })
      )}
    </List>
  );
}
