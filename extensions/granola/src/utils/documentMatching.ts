import type { CalendarEvent } from "./granolaApi";

/**
 * Parse event time from Google Calendar API format
 */
export function parseEventTime(timeData: { dateTime?: string; date?: string }): Date | null {
  if (!timeData) return null;

  // Handle dateTime format (with time)
  if (timeData.dateTime) {
    try {
      // Replace "Z" with "+00:00" for proper timezone handling
      const isoString = timeData.dateTime.replace("Z", "+00:00");
      return new Date(isoString);
    } catch {
      return null;
    }
  }

  // Handle date format (all-day events)
  if (timeData.date) {
    try {
      // Set as UTC timezone for all-day events
      return new Date(`${timeData.date}T00:00:00+00:00`);
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Find a document that matches the calendar event
 * Uses smart matching: exact title + date proximity based on created_at
 */
export function findDocumentForEvent(
  documents: { title?: string; id: string; updated_at?: string; created_at?: string }[],
  event: CalendarEvent,
) {
  const eventSummary = (event.summary || "").toLowerCase();
  const eventStartTime = parseEventTime(event.start || {});

  const matches = documents.filter((doc) => {
    const docTitle = (doc.title || "").toLowerCase();
    const eventIncludesDoc = eventSummary.includes(docTitle);
    const docIncludesEvent = docTitle.includes(eventSummary);
    return eventIncludesDoc || docIncludesEvent;
  });

  if (matches.length === 0) {
    return null;
  }

  if (matches.length === 1) {
    return matches[0];
  }

  // Multiple matches - use smart selection
  if (eventStartTime) {
    // Find document closest to the event date using CREATED_AT primarily
    const matchesWithDistance = matches.map((doc) => {
      const docCreatedAt = new Date(doc.created_at || doc.updated_at || "");
      const createdDistance = Math.abs(eventStartTime.getTime() - docCreatedAt.getTime());

      return {
        ...doc,
        createdDistance,
        createdAt: docCreatedAt,
      };
    });

    // Sort by created_at distance first (closest to when meeting happened)
    matchesWithDistance.sort((a, b) => {
      return a.createdDistance - b.createdDistance;
    });

    const selectedDoc = matchesWithDistance[0];
    return selectedDoc;
  } else {
    // No event time available, fall back to most recent
    matches.sort((a, b) => {
      const dateA = new Date(a.updated_at || "").getTime() || 0;
      const dateB = new Date(b.updated_at || "").getTime() || 0;
      return dateB - dateA;
    });

    return matches[0];
  }
}

/**
 * Format event time for display in dropdown (mm/dd HH:MMAM/PM format)
 */
export function formatEventTimeForDisplay(event: CalendarEvent): string {
  const startTime = parseEventTime(event.start || {});

  if (!startTime) {
    return "TBD";
  }

  // Check if it's an all-day event
  if (event.start?.date && !event.start?.dateTime) {
    const month = (startTime.getMonth() + 1).toString().padStart(2, "0");
    const day = startTime.getDate().toString().padStart(2, "0");
    return `${month}/${day}`;
  }

  // Regular event with time - mm/dd HH:MMAM/PM format
  const month = (startTime.getMonth() + 1).toString().padStart(2, "0");
  const day = startTime.getDate().toString().padStart(2, "0");

  let hours = startTime.getHours();
  const minutes = startTime.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";

  if (hours > 12) {
    hours -= 12;
  } else if (hours === 0) {
    hours = 12;
  }

  return `${month}/${day} ${hours}:${minutes}${ampm}`;
}
