import { Action, ActionPanel, Icon, List, Toast, showToast, closeMainWindow, Keyboard } from "@raycast/api";
import { useMemo, useState } from "react";
import { nanoid } from "nanoid";
import Fuse from "fuse.js";
import { addYears, isPast, startOfDay, addHours, addMinutes, roundToNearestMinutes, format } from "date-fns";
import Sherlock from "sherlockjs";
import { useGoogleAPIs, withGoogleAPIs } from "./lib/google";
import useCalendars from "./hooks/useCalendars";

// ============= Types =============

interface QuickEvent {
  id: string;
  eventTitle: string | null;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  matchedCalendar?: string;
  timezone?: string;
}

// ============= Timezone Handling =============

const TIMEZONE_OFFSETS: Record<string, number> = {
  // US timezones (full)
  EST: -300,
  EDT: -240,
  CST: -360,
  CDT: -300,
  MST: -420,
  MDT: -360,
  PST: -480,
  PDT: -420,
  AKST: -540,
  AKDT: -480,
  HST: -600,
  // US timezones (short) - map to standard time
  ET: -300,
  CT: -360,
  MT: -420,
  PT: -480,
  // European
  GMT: 0,
  UTC: 0,
  WET: 0,
  WEST: 60,
  CET: 60,
  CEST: 120,
  EET: 120,
  EEST: 180,
  // Asia/Pacific
  IST: 330,
  JST: 540,
  AEST: 600,
  AEDT: 660,
  NZST: 720,
  NZDT: 780,
};

function extractTimezone(query: string): { query: string; timezone: string | null; offsetMinutes: number | null } {
  const tzList =
    "EST|EDT|CST|CDT|MST|MDT|PST|PDT|AKST|AKDT|HST|ET|CT|MT|PT|GMT|UTC|WET|WEST|CET|CEST|EET|EEST|IST|JST|AEST|AEDT|NZST|NZDT";
  const tzPattern = new RegExp(`\\b(\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)?)\\s+(${tzList})\\b`, "gi");

  const match = query.match(tzPattern);
  if (match) {
    const fullMatch = match[0];
    const tzMatch = fullMatch.match(new RegExp(`(${tzList})$`, "i"));
    if (tzMatch) {
      const tz = tzMatch[1].toUpperCase();
      const offset = TIMEZONE_OFFSETS[tz];
      if (offset !== undefined) {
        const cleanedQuery = query.replace(new RegExp(`\\s+${tz}\\b`, "gi"), "");
        return { query: cleanedQuery, timezone: tz, offsetMinutes: offset };
      }
    }
  }
  return { query, timezone: null, offsetMinutes: null };
}

function applyTimezone(date: Date, offsetMinutes: number): Date {
  const localOffset = date.getTimezoneOffset();
  const diffMinutes = -offsetMinutes - localOffset;
  return new Date(date.getTime() + diffMinutes * 60 * 1000);
}

// ============= Date Helpers =============

function adjustPastDate(date: Date, isAllDay: boolean): Date {
  const now = new Date();
  const compareDate = isAllDay ? startOfDay(date) : date;
  const compareNow = isAllDay ? startOfDay(now) : now;

  if (isPast(compareDate) && compareDate < compareNow) {
    return addYears(date, 1);
  }
  return date;
}

function getDefaultStartDate(): Date {
  const startDate = addMinutes(new Date(), 15);
  return roundToNearestMinutes(startDate, { nearestTo: 30 });
}

function getDefaultEndDate(startDate: Date): Date {
  return addHours(startDate, 1);
}

function preprocessQuery(query: string): string {
  // Convert time ranges like "2-3pm" to "from 2pm to 3pm"
  const timeRangePattern = /\b(\d{1,2}(?::\d{2})?)\s*-\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)\b/gi;
  query = query.replace(timeRangePattern, (_, start, end, ampm) => {
    return `from ${start}${ampm} to ${end}${ampm}`;
  });

  // Handle "2pm-3pm" format
  const timeRangeWithBothPattern = /\b(\d{1,2}(?::\d{2})?)\s*(am|pm)\s*-\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)\b/gi;
  query = query.replace(timeRangeWithBothPattern, (_, start, ampm1, end, ampm2) => {
    return `from ${start}${ampm1} to ${end}${ampm2}`;
  });

  // EU time formats (14h, 14h30)
  const timePattern = /\b(\d{1,2})([uUhH])(\d{2})?\b/g;
  query = query.replace(timePattern, (_, hour, __, minutes) => {
    const h = parseInt(hour, 10);
    const m = minutes ? parseInt(minutes, 10) : 0;
    const date = new Date();
    date.setHours(h, m, 0, 0);
    return format(date, "h:mm aa");
  });

  return query;
}

// ============= Calendar Matching =============

function matchCalendar(calendarInput: string, calendarNames: string[]): string | undefined {
  if (!calendarInput || calendarNames.length === 0) {
    return undefined;
  }

  const normalizedInput = calendarInput.toLowerCase();

  // Exact match (case-insensitive)
  const exactMatch = calendarNames.find((cal) => cal.toLowerCase() === normalizedInput);
  if (exactMatch) {
    return exactMatch;
  }

  // Prefix match
  const prefixMatches = calendarNames.filter((cal) => cal.toLowerCase().startsWith(normalizedInput));
  if (prefixMatches.length === 1) {
    return prefixMatches[0];
  }

  // Fuzzy match
  const fuse = new Fuse(calendarNames, { threshold: 0.4, ignoreLocation: true });
  const fuseResults = fuse.search(calendarInput);
  if (fuseResults.length > 0) {
    return fuseResults[0].item;
  }

  return undefined;
}

// ============= Date Formatting =============

function formatRelativeDay(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor((startOfDay(date).getTime() - startOfDay(now).getTime()) / (1000 * 60 * 60 * 24));

  switch (diffDays) {
    case -1:
      return "yesterday";
    case 0:
      return "today";
    case 1:
      return "tomorrow";
    case 2:
    case 3:
    case 4:
    case 5:
    case 6:
      return format(date, "EEEE");
    default:
      return format(date, "MMM d, yyyy");
  }
}

function formatEventDate(event: QuickEvent): string {
  if (event.isAllDay) {
    return `${formatRelativeDay(event.startDate)} all-day`;
  }
  return `${formatRelativeDay(event.startDate)} from ${format(event.startDate, "h:mm a")} to ${format(event.endDate, "h:mm a")}`;
}

// ============= Main Component =============

function QuickCreateEvent() {
  const { calendar } = useGoogleAPIs();
  const { data: calendarsData, isLoading: isLoadingCalendars } = useCalendars();
  const [searchText, setSearchText] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Get calendar names and ID mapping
  const calendars = useMemo(() => {
    const all = [...calendarsData.selected, ...calendarsData.unselected].filter((cal) => cal.accessRole === "owner");
    return all.map((cal) => ({
      id: cal.primary ? "primary" : cal.id!,
      name: cal.summaryOverride ?? cal.summary ?? "Unknown",
    }));
  }, [calendarsData]);

  const calendarNames = useMemo(() => calendars.map((c) => c.name), [calendars]);

  // Parse the input
  const parsedEvent = useMemo((): QuickEvent | null => {
    if (!searchText.trim()) return null;

    let query = searchText;

    // Extract calendar selector (/work, /personal, etc.)
    let matchedCalendar: string | undefined;
    const calendarMatch = query.match(/\s\/([^\s/]+)\s*$/);
    if (calendarMatch) {
      const calendarInput = calendarMatch[1];
      matchedCalendar = matchCalendar(calendarInput, calendarNames);
      query = query.slice(0, calendarMatch.index).trim();
    }

    // Extract timezone
    const { query: queryWithoutTz, timezone, offsetMinutes } = extractTimezone(query);
    query = queryWithoutTz;

    // Preprocess and parse with Sherlock
    const preprocessed = preprocessQuery(query);
    const parsed = Sherlock.parse(preprocessed);

    let startDate = parsed.startDate ?? getDefaultStartDate();
    let endDate = parsed.endDate ?? getDefaultEndDate(startDate);

    // Apply timezone
    if (offsetMinutes !== null) {
      startDate = applyTimezone(startDate, offsetMinutes);
      endDate = applyTimezone(endDate, offsetMinutes);
    }

    // Adjust past dates
    const originalStart = startDate;
    startDate = adjustPastDate(startDate, parsed.isAllDay);
    if (startDate.getTime() !== originalStart.getTime()) {
      endDate = addYears(endDate, 1);
    }

    return {
      id: nanoid(),
      eventTitle: parsed.eventTitle,
      startDate,
      endDate,
      isAllDay: parsed.isAllDay,
      matchedCalendar,
      timezone: timezone ?? undefined,
    };
  }, [searchText, calendarNames]);

  // Get ordered calendars (matched first)
  const orderedCalendars = useMemo(() => {
    if (!parsedEvent?.matchedCalendar) {
      return calendars;
    }
    const matched = calendars.find((c) => c.name === parsedEvent.matchedCalendar);
    if (!matched) return calendars;
    return [matched, ...calendars.filter((c) => c.id !== matched.id)];
  }, [calendars, parsedEvent?.matchedCalendar]);

  // Create event
  const createEvent = async (event: QuickEvent, calendarId: string) => {
    setIsCreating(true);
    try {
      await showToast({ style: Toast.Style.Animated, title: "Creating event..." });

      const requestBody = event.isAllDay
        ? {
            summary: event.eventTitle || "Untitled event",
            start: { date: format(event.startDate, "yyyy-MM-dd") },
            end: { date: format(event.endDate, "yyyy-MM-dd") },
          }
        : {
            summary: event.eventTitle || "Untitled event",
            start: { dateTime: event.startDate.toISOString() },
            end: { dateTime: event.endDate.toISOString() },
          };

      await calendar.events.insert({
        calendarId,
        requestBody,
      });

      await showToast({ style: Toast.Style.Success, title: "Event created!" });
      await closeMainWindow({ clearRootSearch: true });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create event",
        message: String(error),
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getSubtitle = (event: QuickEvent) => {
    const dateStr = formatEventDate(event);
    if (event.matchedCalendar) {
      return `${dateStr} → ${event.matchedCalendar}`;
    }
    return dateStr;
  };

  return (
    <List
      isLoading={isLoadingCalendars || isCreating}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="E.g. Lunch tomorrow 12-1pm /work"
      throttle
    >
      {parsedEvent && (
        <List.Section title="Your quick event">
          <List.Item
            key={parsedEvent.id}
            title={parsedEvent.eventTitle || "Untitled event"}
            subtitle={getSubtitle(parsedEvent)}
            icon={Icon.Calendar}
            accessories={[
              ...(parsedEvent.timezone ? [{ tag: { value: parsedEvent.timezone, color: "#34C759" } }] : []),
              ...(parsedEvent.matchedCalendar
                ? [{ tag: { value: parsedEvent.matchedCalendar, color: "#007AFF" } }]
                : []),
            ]}
            actions={
              <ActionPanel title="Add to calendar">
                {orderedCalendars.map((cal, index) => (
                  <Action
                    key={cal.id}
                    title={`Add to '${cal.name}'`}
                    onAction={() => createEvent(parsedEvent, cal.id)}
                    icon={Icon.Calendar}
                    shortcut={{ modifiers: ["cmd"], key: (index + 1).toString() as Keyboard.KeyEquivalent }}
                  />
                ))}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

export default withGoogleAPIs(QuickCreateEvent);
