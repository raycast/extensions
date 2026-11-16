import { List, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { EventWithCalendar, computeDuration, getConferenceUrl, fetchEventsWithErrorHandling } from "./utils";
import { formatEventTime } from "./lib/dates";
import { EventActions } from "./event-actions";

export default function SearchEvents() {
  const [allEvents, setAllEvents] = useState<EventWithCalendar[]>([]);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    async function fetchEvents() {
      const now = new Date();
      const end30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const { events, error } = await fetchEventsWithErrorHandling(
        now.toISOString(),
        end30.toISOString(),
        () => active,
      );
      if (!active) return;
      setAllEvents(events);
      setHasError(error);
      setIsLoading(false);
    }
    fetchEvents().catch(() => {
      // A failed error toast must still leave a visible, settled error state.
      if (!active) return;
      setHasError(true);
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const filtered = searchText
    ? allEvents.filter((e) => e.title?.toLowerCase().includes(searchText.toLowerCase()))
    : allEvents;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search events in the next 30 days..."
      throttle
    >
      {filtered.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={hasError ? Icon.ExclamationMark : Icon.MagnifyingGlass}
          title={hasError ? "Unable to Load Events" : "No Events Found"}
          description={
            hasError
              ? "Calendar availability is unknown. Check the error and try again later."
              : searchText
                ? "Try a different search term"
                : "No upcoming events in the next 30 days"
          }
        />
      ) : (
        filtered.map((event, index) => {
          const datetime = formatEventTime(event);
          const duration = computeDuration(event.start, event.end, event.duration, event.timeZone);
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
              subtitle={datetime}
              accessories={accessories}
              actions={<EventActions event={event} />}
            />
          );
        })
      )}
    </List>
  );
}
