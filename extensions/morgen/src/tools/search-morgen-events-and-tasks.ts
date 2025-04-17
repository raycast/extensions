import { MorgenAPI } from "../api/morgen";
import { addDays, formatISO, parseISO, format, startOfDay, endOfDay } from "date-fns";

type Input = {
  /**
   * Search query, used to filter events containing specific text in title or description
   */
  query?: string;

  /**
   * Search start date (ISO format or relative dates like "today", "tomorrow")
   * Defaults to today
   */
  startDate?: string;

  /**
   * Search end date (ISO format or relative dates)
   * Defaults to 7 days after the start date
   */
  endDate?: string;
};

interface EventResult {
  id: string;
  title: string;
  description?: string;
  start: string; // Formatted as human-readable time
  end: string; // Formatted as human-readable time
  duration: string; // Formatted as hours and minutes
  location?: string;
  calendarName?: string;
  color?: string;
}

/**
 * Search events and tasks in Morgen calendar
 *
 * This tool allows you to search for events within a specific date range and filter results by keywords.
 */
export default async function searchMorgenEventsAndTasks(input: Input): Promise<{ events: EventResult[] }> {
  const api = new MorgenAPI();

  // Process dates
  const now = new Date();
  let startDate = now;
  let endDate = addDays(now, 7);

  if (input.startDate) {
    if (input.startDate.toLowerCase() === "today") {
      startDate = now;
    } else if (input.startDate.toLowerCase() === "tomorrow") {
      startDate = addDays(now, 1);
    } else {
      try {
        startDate = parseISO(input.startDate);
      } catch (e) {
        // If parsing fails, use default value
      }
    }
  }

  if (input.endDate) {
    if (input.endDate.toLowerCase() === "today") {
      endDate = now;
    } else if (input.endDate.toLowerCase() === "tomorrow") {
      endDate = addDays(now, 1);
    } else {
      try {
        endDate = parseISO(input.endDate);
      } catch (e) {
        // If parsing fails, use default value
        endDate = addDays(startDate, 7);
      }
    }
  } else {
    // Default search range is 7 days
    endDate = addDays(startDate, 7);
  }

  // Ensure start date is not later than end date
  if (startDate > endDate) {
    const temp = startDate;
    startDate = endDate;
    endDate = temp;
  }

  // Format as full ISO strings with time component
  const startDateISO = formatISO(startOfDay(startDate));
  const endDateISO = formatISO(endOfDay(endDate));

  // Get events
  const events = await api.getEvents(startDateISO, endDateISO);

  // Get calendar information for display
  const calendars = await api.getCalendars();
  const calendarMap = new Map(calendars.map((cal) => [cal.id, cal]));

  // Filter events based on the query
  const filteredEvents = input.query
    ? events.filter((event) => {
        const query = input.query?.toLowerCase() || "";
        const title = event.title.toLowerCase();
        const description = event.description?.toLowerCase() || "";
        return title.includes(query) || description.includes(query);
      })
    : events;

  // Format results
  const formattedEvents: EventResult[] = filteredEvents.map((event) => {
    // Calculate end time
    const startTime = parseISO(event.start);
    const durationMatch = event.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    const hours = parseInt(durationMatch?.[1] || "0", 10);
    const minutes = parseInt(durationMatch?.[2] || "0", 10);
    const endTime = new Date(startTime.getTime() + (hours * 60 + minutes) * 60 * 1000);

    // Format display times
    const startFormatted = format(startTime, "yyyy-MM-dd HH:mm");
    const endFormatted = format(endTime, "yyyy-MM-dd HH:mm");
    const durationFormatted = hours > 0 ? `${hours}h ${minutes > 0 ? minutes + "m" : ""}` : `${minutes}m`;

    // Get calendar information
    const calendar = event.calendarId ? calendarMap.get(event.calendarId) : undefined;
    const calendarName = calendar?.name;
    const color = calendar?.color || calendar?.["morgen.so:metadata"]?.overrideColor;

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      start: startFormatted,
      end: endFormatted,
      duration: durationFormatted,
      location: event.location || event["morgen.so:metadata"]?.location,
      calendarName,
      color,
    };
  });

  // Sort by start time
  formattedEvents.sort((a, b) => a.start.localeCompare(b.start));

  return { events: formattedEvents };
}
