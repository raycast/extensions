import { addDays } from "date-fns";

import { type ParsedDueDate, parseDueDate } from "./parse-due-date";

export type Frequency = "daily" | "weekdays" | "weekends" | "weekly" | "monthly" | "yearly";

export type ParsedRecurrence = {
  frequency: Frequency;
  interval: number;
  matchedText: string;
};

export function parseRecurrence(text: string): ParsedRecurrence | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  // 1. Weekdays: every weekday, on weekdays, each weekday, mon-fri, etc.
  const weekdaysMatch = trimmed.match(
    /\b(?:every\s+weekday|on\s+weekdays|each\s+weekday|daily\s+on\s+weekdays|weekdays|mon(?:day)?\s*(?:-|to|through)\s*fri(?:day)?)\b/i,
  );
  if (weekdaysMatch) {
    return { frequency: "weekdays", interval: 1, matchedText: weekdaysMatch[0] };
  }

  // 2. Weekends: every weekend, on weekends, each weekend, sat-sun, etc.
  const weekendsMatch = trimmed.match(
    /\b(?:every\s+weekend|on\s+weekends|each\s+weekend|weekends|sat(?:urday)?\s*(?:and|&|-)\s*sun(?:day)?)\b/i,
  );
  if (weekendsMatch) {
    return { frequency: "weekends", interval: 1, matchedText: weekendsMatch[0] };
  }

  // 3. Explicit interval N units: e.g. "every 2 weeks", "every 3 months", "every 5 days", "every 2 years"
  const intervalMatch = trimmed.match(/\bevery\s+(\d+)\s*(days?|d|weeks?|wks?|w|months?|mos?|m|years?|yrs?|y)\b/i);
  if (intervalMatch) {
    const amount = Number.parseInt(intervalMatch[1], 10);
    const unit = intervalMatch[2].toLowerCase();
    let frequency: Frequency = "daily";
    if (unit.startsWith("w")) {
      frequency = "weekly";
    } else if (unit.startsWith("m")) {
      frequency = "monthly";
    } else if (unit.startsWith("y")) {
      frequency = "yearly";
    }
    return { frequency, interval: amount > 0 ? amount : 1, matchedText: intervalMatch[0] };
  }

  // 4. "every other <unit/day>"
  const otherMatch = trimmed.match(
    /\bevery\s+other\s+(day|week|month|year|mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i,
  );
  if (otherMatch) {
    const target = otherMatch[1].toLowerCase();
    let frequency: Frequency = "daily";
    if (target === "day") {
      frequency = "daily";
    } else if (target === "month") {
      frequency = "monthly";
    } else if (target === "year") {
      frequency = "yearly";
    } else {
      frequency = "weekly";
    }
    return { frequency, interval: 2, matchedText: otherMatch[0] };
  }

  // 5. Common recurrence shorthand keywords
  const biweeklyMatch = trimmed.match(/\b(?:bi-?weekly|fortnightly)\b/i);
  if (biweeklyMatch) {
    return { frequency: "weekly", interval: 2, matchedText: biweeklyMatch[0] };
  }

  const bimonthlyMatch = trimmed.match(/\b(?:bi-?monthly)\b/i);
  if (bimonthlyMatch) {
    return { frequency: "monthly", interval: 2, matchedText: bimonthlyMatch[0] };
  }

  const quarterlyMatch = trimmed.match(/\b(?:quarterly|every\s+quarter)\b/i);
  if (quarterlyMatch) {
    return { frequency: "monthly", interval: 3, matchedText: quarterlyMatch[0] };
  }

  const semiAnnualMatch = trimmed.match(/\b(?:semi-?annually|every\s+half\s+year|every\s+6\s+months)\b/i);
  if (semiAnnualMatch) {
    return { frequency: "monthly", interval: 6, matchedText: semiAnnualMatch[0] };
  }

  const annualMatch = trimmed.match(/\b(?:annually|annual)\b/i);
  if (annualMatch) {
    return { frequency: "yearly", interval: 1, matchedText: annualMatch[0] };
  }

  // 6. Day of week recurring: "every Friday", "every Mon", "each Tuesday"
  const dayOfWeekMatch = trimmed.match(
    /\b(?:every|each)\s+(mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i,
  );
  if (dayOfWeekMatch) {
    return { frequency: "weekly", interval: 1, matchedText: dayOfWeekMatch[0] };
  }

  // 7. Generic daily/weekly/monthly/yearly
  const genericMatch = trimmed.match(
    /\b(?:every\s+day|each\s+day|daily|everyday|every\s+week|each\s+week|weekly|every\s+month|each\s+month|monthly|every\s+year|each\s+year|yearly)\b/i,
  );
  if (genericMatch) {
    const raw = genericMatch[0].toLowerCase();
    let frequency: Frequency = "daily";
    if (raw.includes("week")) {
      frequency = "weekly";
    } else if (raw.includes("month")) {
      frequency = "monthly";
    } else if (raw.includes("year")) {
      frequency = "yearly";
    }
    return { frequency, interval: 1, matchedText: genericMatch[0] };
  }

  return null;
}

const WEEKDAY_ANCHOR_PATTERN =
  /\b(?:mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i;

export type NlpDueDateResolution = {
  dueDate: Date | null;
  parsedDueDate: ParsedDueDate | null;
  recurrence: ParsedRecurrence | null;
};

export function resolveDueDateFromNlp(
  value: string,
  now: Date = new Date(),
  dateFormatPreference?: string,
): NlpDueDateResolution {
  const trimmed = value.trim();
  if (!trimmed) {
    return { dueDate: null, parsedDueDate: null, recurrence: null };
  }

  const recurrence = parseRecurrence(trimmed);

  if (!recurrence) {
    const parsed = parseDueDate(trimmed, now, dateFormatPreference);
    return {
      dueDate: parsed ? parsed.date : null,
      parsedDueDate: parsed,
      recurrence: null,
    };
  }

  // Single weekday-anchored weekly recurrences (e.g. "every Friday", "every other friday", "each tuesday", "every Monday at 9am")
  if (recurrence.frequency === "weekly" && WEEKDAY_ANCHOR_PATTERN.test(recurrence.matchedText)) {
    const parsed = parseDueDate(trimmed, now, dateFormatPreference);
    if (parsed) {
      return {
        dueDate: parsed.date,
        parsedDueDate: parsed,
        recurrence,
      };
    }
  }

  // Interval, generic, weekdays, and weekends recurrences (e.g. "every 2 weeks", "every 2 weeks at 10am", "every day at 9am", "mon-fri 8am")
  // Strip the recurrence phrase to see if an explicit time or start date was specified
  const remainingText = trimmed
    .replace(recurrence.matchedText, "")
    .replace(/^(?:at|from|on|starting)\s+/i, "")
    .trim();
  if (remainingText) {
    const parsedRemainder = parseDueDate(remainingText, now, dateFormatPreference);
    if (parsedRemainder) {
      if (parsedRemainder.isDateTime && !parsedRemainder.hasExplicitDate) {
        // Only time was parsed (e.g. "10am", "at 9am", "8am")
        const candidateDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          parsedRemainder.date.getHours(),
          parsedRemainder.date.getMinutes(),
          parsedRemainder.date.getSeconds(),
          parsedRemainder.date.getMilliseconds(),
        );

        // Only merge into today if the resulting time is still in the future; otherwise keep parsedRemainder.date (forward-dated)
        let dueDate = candidateDate.getTime() > now.getTime() ? candidateDate : parsedRemainder.date;

        if (recurrence.frequency === "weekdays") {
          if (dueDate.getDay() === 6) {
            dueDate = addDays(dueDate, 2);
          } else if (dueDate.getDay() === 0) {
            dueDate = addDays(dueDate, 1);
          }
        } else if (recurrence.frequency === "weekends") {
          if (dueDate.getDay() >= 1 && dueDate.getDay() <= 5) {
            dueDate = addDays(dueDate, 6 - dueDate.getDay());
          }
        }

        return {
          dueDate,
          parsedDueDate: {
            date: dueDate,
            isDateTime: true,
            matchedText: trimmed,
            hasExplicitDate: false,
          },
          recurrence,
        };
      }

      // Explicit start date was provided (e.g. "starting next Friday", "from tomorrow 10am")
      return {
        dueDate: parsedRemainder.date,
        parsedDueDate: parsedRemainder,
        recurrence,
      };
    }
  }

  // Pure interval/generic/weekdays/weekends recurrence without explicit start date/time
  let fallbackDate = now;
  if (recurrence.frequency === "weekdays") {
    if (now.getDay() === 6) {
      fallbackDate = addDays(now, 2);
    } else if (now.getDay() === 0) {
      fallbackDate = addDays(now, 1);
    }
  } else if (recurrence.frequency === "weekends") {
    if (now.getDay() >= 1 && now.getDay() <= 5) {
      fallbackDate = addDays(now, 6 - now.getDay());
    }
  }

  const fallbackParsed: ParsedDueDate = {
    date: fallbackDate,
    isDateTime: false,
    matchedText: recurrence.matchedText,
    hasExplicitDate: false,
  };

  return {
    dueDate: fallbackDate,
    parsedDueDate: fallbackParsed,
    recurrence,
  };
}
