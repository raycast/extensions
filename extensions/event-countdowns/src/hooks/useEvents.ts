import { useCallback, useEffect, useMemo } from "react";
import { useLocalStorage } from "@raycast/utils";
import { randomUUID } from "crypto";
import { Event, EventFormValues } from "../utils/types";
import { shouldArchive } from "../utils/date-utils";

const STORAGE_KEY = "event-countdowns-events";

export function useEvents() {
  const { value: events, setValue: setEvents, isLoading } = useLocalStorage<Event[]>(STORAGE_KEY, []);

  // Auto-archive past one-time events
  useEffect(() => {
    if (!events || events.length === 0) return;

    const eventsToArchive = events.filter((event) => !event.archived && shouldArchive(event.baseDate, event.repeat));

    if (eventsToArchive.length > 0) {
      const updatedEvents = events.map((event) => {
        if (eventsToArchive.some((e) => e.id === event.id)) {
          return { ...event, archived: true, updatedAt: new Date().toISOString() };
        }
        return event;
      });
      setEvents(updatedEvents);
    }
  }, [events, setEvents]);

  // Filtered views
  const activeEvents = useMemo(() => {
    return events?.filter((e) => !e.archived) ?? [];
  }, [events]);

  const archivedEvents = useMemo(() => {
    return events?.filter((e) => e.archived) ?? [];
  }, [events]);

  // Create a new event
  const addEvent = useCallback(
    async (values: EventFormValues) => {
      if (!values.baseDate) {
        throw new Error("Base date is required");
      }

      const now = new Date().toISOString();
      const newEvent: Event = {
        id: randomUUID(),
        title: values.title.trim(),
        baseDate: values.baseDate.trim(), // Already in YYYY-MM-DD format
        repeat: values.repeat,
        archived: false,
        createdAt: now,
        updatedAt: now,
      };

      // Check if should be immediately archived (past one-time event)
      if (shouldArchive(newEvent.baseDate, newEvent.repeat)) {
        newEvent.archived = true;
      }

      await setEvents([...(events ?? []), newEvent]);
      return newEvent;
    },
    [events, setEvents],
  );

  // Update an existing event
  const updateEvent = useCallback(
    async (id: string, values: Partial<EventFormValues>) => {
      if (!events) return;

      const index = events.findIndex((e) => e.id === id);
      if (index === -1) return;

      const updated = [...events];
      const existing = updated[index];

      const updatedEvent: Event = {
        ...existing,
        title: values.title?.trim() ?? existing.title,
        baseDate: values.baseDate?.trim() ?? existing.baseDate, // Already in YYYY-MM-DD format
        repeat: values.repeat ?? existing.repeat,
        updatedAt: new Date().toISOString(),
      };

      // Re-check archive status
      if (shouldArchive(updatedEvent.baseDate, updatedEvent.repeat)) {
        updatedEvent.archived = true;
      } else {
        updatedEvent.archived = false;
      }

      updated[index] = updatedEvent;
      await setEvents(updated);
      return updatedEvent;
    },
    [events, setEvents],
  );

  // Archive an event manually
  const archiveEvent = useCallback(
    async (id: string) => {
      if (!events) return;

      const updated = events.map((event) => {
        if (event.id === id) {
          return { ...event, archived: true, updatedAt: new Date().toISOString() };
        }
        return event;
      });

      await setEvents(updated);
    },
    [events, setEvents],
  );

  // Delete an event permanently
  const deleteEvent = useCallback(
    async (id: string) => {
      if (!events) return;
      await setEvents(events.filter((e) => e.id !== id));
    },
    [events, setEvents],
  );

  // Get a single event by ID
  const getEvent = useCallback(
    (id: string): Event | undefined => {
      return events?.find((e) => e.id === id);
    },
    [events],
  );

  return {
    events: events ?? [],
    activeEvents,
    archivedEvents,
    isLoading,
    addEvent,
    updateEvent,
    archiveEvent,
    deleteEvent,
    getEvent,
  };
}
