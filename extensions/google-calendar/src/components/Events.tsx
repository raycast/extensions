import { useMemo } from "react";
import { useGetDailyCalendarEvents } from "../hooks/useGetDailyCalendarEvents";
import { Event } from "../types/event";
import { EventsList } from "./EventsList";

interface EventsProps {
  calendarId: string;
}

const filterEvents = (events: Event[]) => {
  if (!events) return [];
  return events.filter((event) => event.summary);
};

export const Events: React.FC<EventsProps> = ({ calendarId }) => {
  const { data, isLoading } = useGetDailyCalendarEvents(calendarId);
  const filteredEvents = useMemo(() => filterEvents(data), [data]);
  return <EventsList events={filteredEvents} isLoading={isLoading} />;
};
