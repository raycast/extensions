import { showToast, Toast, getPreferenceValues } from '@raycast/api';
import { useState } from 'react';
import { nanoid } from 'nanoid';
import Fuse from 'fuse.js';
import { addYears, isPast, startOfDay } from 'date-fns';
import { CalendarEvent } from './types';
import { getEndDate, getStartDate, preprocessQuery } from './dates';
import osascript from 'osascript-tag';
import Sherlock from 'sherlockjs';

// Timezone offsets in minutes from UTC
const TIMEZONE_OFFSETS: Record<string, number> = {
  // US timezones (full)
  EST: -300, EDT: -240,
  CST: -360, CDT: -300,
  MST: -420, MDT: -360,
  PST: -480, PDT: -420,
  AKST: -540, AKDT: -480,
  HST: -600,
  // US timezones (short) - map to standard time
  ET: -300, CT: -360, MT: -420, PT: -480,
  // European
  GMT: 0, UTC: 0,
  WET: 0, WEST: 60,
  CET: 60, CEST: 120,
  EET: 120, EEST: 180,
  // Asia/Pacific
  IST: 330,
  JST: 540,
  CST_CHINA: 480,
  AEST: 600, AEDT: 660,
  NZST: 720, NZDT: 780,
};

function extractTimezone(query: string): { query: string; timezone: string | null; offsetMinutes: number | null } {
  // Match timezone at end of time expressions, e.g., "3pm EST", "3pm ET", "15:00 GMT"
  const tzList = "EST|EDT|CST|CDT|MST|MDT|PST|PDT|AKST|AKDT|HST|ET|CT|MT|PT|GMT|UTC|WET|WEST|CET|CEST|EET|EEST|IST|JST|AEST|AEDT|NZST|NZDT";
  const tzPattern = new RegExp(`\\b(\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)?)\\s+(${tzList})\\b`, "gi");

  const match = query.match(tzPattern);
  if (match) {
    const fullMatch = match[0];
    const tzMatch = fullMatch.match(new RegExp(`(${tzList})$`, "i"));
    if (tzMatch) {
      const tz = tzMatch[1].toUpperCase();
      const offset = TIMEZONE_OFFSETS[tz];
      if (offset !== undefined) {
        // Remove timezone from query but keep the time
        const cleanedQuery = query.replace(new RegExp(`\\s+${tz}\\b`, 'gi'), '');
        return { query: cleanedQuery, timezone: tz, offsetMinutes: offset };
      }
    }
  }
  return { query, timezone: null, offsetMinutes: null };
}

function applyTimezone(date: Date, offsetMinutes: number): Date {
  // Get local timezone offset in minutes
  const localOffset = date.getTimezoneOffset(); // Note: getTimezoneOffset returns opposite sign
  // Calculate difference: we want to convert FROM the specified timezone TO local
  const diffMinutes = -offsetMinutes - localOffset;
  // Adjust the date
  return new Date(date.getTime() + diffMinutes * 60 * 1000);
}

function adjustPastDate(date: Date, isAllDay: boolean): Date {
  const now = new Date();
  const compareDate = isAllDay ? startOfDay(date) : date;
  const compareNow = isAllDay ? startOfDay(now) : now;

  if (isPast(compareDate) && compareDate < compareNow) {
    return addYears(date, 1);
  }
  return date;
}

export const executeJxa = async (script: string) => {
  try {
    const result = await osascript.jxa({ parse: true })`${script}`;
    return result;
  } catch (err: unknown) {
    if (typeof err === 'string') {
      const message = err.replace('execution error: Error: ', '');
      console.log(err);
      showToast({
        style: Toast.Style.Failure,
        title: 'Something went wrong',
        message: message,
      });
    }
  }
};

function matchCalendar(calendarInput: string, calendars: string[]): string | undefined {
  if (!calendarInput || calendars.length === 0) {
    return undefined;
  }

  const normalizedInput = calendarInput.toLowerCase();

  // First, try exact match (case-insensitive)
  const exactMatch = calendars.find((cal) => cal.toLowerCase() === normalizedInput);
  if (exactMatch) {
    return exactMatch;
  }

  // Then, try prefix match (e.g., "/w" matches "Work" if it's the only match)
  const prefixMatches = calendars.filter((cal) => cal.toLowerCase().startsWith(normalizedInput));
  if (prefixMatches.length === 1) {
    return prefixMatches[0];
  }

  // Finally, use fuzzy matching
  const fuse = new Fuse(calendars, {
    threshold: 0.4,
    ignoreLocation: true,
  });
  const fuseResults = fuse.search(calendarInput);
  if (fuseResults.length > 0) {
    return fuseResults[0].item;
  }

  return undefined;
}

export function useCalendar() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<CalendarEvent[]>([]);
  const [calendarText, setCalendarText] = useState('');

  const preferences = getPreferenceValues();
  const calendars = String(preferences.calendars).split(',').map((c: string) => c.trim());

  async function parse(query: string) {
    try {
      setIsLoading(true);
      setCalendarText(query);

      if (query.length === 0) {
        setResults([]);
      } else {
        // Extract calendar selector (e.g., "/work" or "/personal") - must be at end of string
        let matchedCalendar: string | undefined;
        const calendarMatch = query.match(/\s\/([^\s\/]+)\s*$/);
        if (calendarMatch) {
          const calendarInput = calendarMatch[1];
          matchedCalendar = matchCalendar(calendarInput, calendars);
          // Always strip the calendar selector from query, even if no match found
          query = query.slice(0, calendarMatch.index).trim();
        }

        // Extract location (e.g., "@(New York)" or "@CentralPark")
        let location = '';
        try {
          const match = query.match(/@(?:\(([^)]+)\)|([^@\s]+))/);
          location = match?.[1] || match?.[2] || '';
        } catch (error) {
          location = '';
        }
        query = query.replace(/@(?:\(([^)]+)\)|([^@\s]+))/, '');

        // Extract timezone (e.g., "3pm EST")
        const { query: queryWithoutTz, timezone, offsetMinutes } = extractTimezone(query);
        query = queryWithoutTz;

        const preprocessedQuery = preprocessQuery(query);

        const parsedEvent = Sherlock.parse(preprocessedQuery);

        const event: CalendarEvent = {
          ...parsedEvent,
          location: location,
          matchedCalendar: matchedCalendar,
          timezone: timezone || undefined,
          id: nanoid(),
        };

        if (!event.startDate) {
          event.startDate = getStartDate();
        }

        if (!event.endDate) {
          event.endDate = getEndDate(event.startDate);
        }

        // Apply timezone conversion if specified
        if (offsetMinutes !== null) {
          event.startDate = applyTimezone(event.startDate, offsetMinutes);
          event.endDate = applyTimezone(event.endDate, offsetMinutes);
        }

        // Adjust past dates to next year
        const originalStart = event.startDate;
        event.startDate = adjustPastDate(event.startDate, event.isAllDay);
        // If start date was adjusted, adjust end date by the same amount
        if (event.startDate.getTime() !== originalStart.getTime()) {
          event.endDate = addYears(event.endDate, 1);
        }

        setResults([event]);
      }
    } catch (error) {
      console.error('error', error);
      showToast({
        style: Toast.Style.Failure,
        title: 'Could not parse event',
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return {
    isLoading,
    results,
    calendarText,
    calendars,
    parse,
  };
}
