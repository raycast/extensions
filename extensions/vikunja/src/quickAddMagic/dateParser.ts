import { calculateDayInterval } from "./calculateDayInterval";
import { calculateNearestHours } from "./calculateNearestHours";
import { replaceAll } from "./replaceAll";

export interface dateParseResult {
  newText: string;
  date: Date | null;
}

interface dateFoundResult {
  foundText: string | null;
  date: Date | null;
}

const monthsRegexGroup =
  "(january|february|march|april|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)";

function matchDateAtBoundary(
  text: string,
  pattern: string,
): RegExpExecArray | null {
  const regex = new RegExp(`(^| )${pattern}($| )`, "gi");
  let result: RegExpExecArray | null;
  while ((result = regex.exec(text)) !== null) {
    const matchEnd = result.index + result[0].length;
    const isAtStart = result.index === 0;
    const isAtEnd = matchEnd >= text.length;

    if (isAtStart || isAtEnd) return result;

    const afterMatch = text.substring(matchEnd);
    if (/^(at |@ )/i.test(afterMatch)) return result;
  }

  return null;
}

function matchesDateExpr(text: string, dateExpr: string): boolean {
  return text.match(new RegExp("(^| )" + dateExpr, "gi")) !== null;
}

export const parseDate = (
  text: string,
  now: Date = new Date(),
): dateParseResult => {
  if (matchesDateExpr(text, "today")) {
    return addTimeToDate(
      text,
      getDateFromInterval(calculateDayInterval("today")),
      "today",
    );
  }
  if (matchesDateExpr(text, "tonight")) {
    const taskDate = getDateFromInterval(calculateDayInterval("today"));
    taskDate.setHours(21);
    return addTimeToDate(text, taskDate, "tonight");
  }
  if (matchesDateExpr(text, "tomorrow")) {
    return addTimeToDate(
      text,
      getDateFromInterval(calculateDayInterval("tomorrow")),
      "tomorrow",
    );
  }
  if (matchesDateExpr(text, "next monday")) {
    return addTimeToDate(
      text,
      getDateFromInterval(calculateDayInterval("nextMonday")),
      "next monday",
    );
  }
  if (matchesDateExpr(text, "this weekend")) {
    return addTimeToDate(
      text,
      getDateFromInterval(calculateDayInterval("thisWeekend")),
      "this weekend",
    );
  }
  if (matchesDateExpr(text, "later this week")) {
    return addTimeToDate(
      text,
      getDateFromInterval(calculateDayInterval("laterThisWeek")),
      "later this week",
    );
  }
  if (matchesDateExpr(text, "later next week")) {
    return addTimeToDate(
      text,
      getDateFromInterval(calculateDayInterval("laterNextWeek")),
      "later next week",
    );
  }
  if (matchesDateExpr(text, "next week")) {
    return addTimeToDate(
      text,
      getDateFromInterval(calculateDayInterval("nextWeek")),
      "next week",
    );
  }
  if (matchesDateExpr(text, "next month")) {
    const date: Date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() + 1);
    date.setHours(calculateNearestHours(date));
    date.setMinutes(0);
    date.setSeconds(0);

    return addTimeToDate(text, date, "next month");
  }
  if (matchesDateExpr(text, "end of month")) {
    const curDate: Date = new Date();
    const date: Date = new Date(
      curDate.getFullYear(),
      curDate.getMonth() + 1,
      0,
    );
    date.setHours(calculateNearestHours(date));
    date.setMinutes(0);
    date.setSeconds(0);

    return addTimeToDate(text, date, "end of month");
  }

  let parsed = getDateFromWeekday(text, now);
  if (parsed.date !== null) {
    return addTimeToDate(text, parsed.date, parsed.foundText);
  }

  parsed = getDayFromText(text, now);
  if (parsed.date !== null) {
    const month = getMonthFromText(text, parsed.date);
    return addTimeToDate(month.newText, month.date, parsed.foundText);
  }

  parsed = getDateFromTextIn(text, now);
  if (parsed.date !== null) {
    return addTimeToDate(text, parsed.date, parsed.foundText);
  }

  parsed = getDateFromText(text, now);

  if (parsed.date === null) {
    const time = addTimeToDate(text, new Date(now), parsed.foundText);

    if (time.date !== null && +now !== +time.date) {
      return time;
    }

    return {
      newText: replaceAll(text, parsed.foundText ?? "", ""),
      date: parsed.date,
    };
  }

  return addTimeToDate(text, parsed.date, parsed.foundText);
};

const addTimeToDate = (
  text: string,
  date: Date,
  previousMatch: string | null,
): dateParseResult => {
  previousMatch = previousMatch?.trim() || "";
  text = replaceAll(text, previousMatch, "");
  if (previousMatch === null) {
    return {
      newText: text,
      date: null,
    };
  }

  const timeRegex = " (at|@) ([0-9][0-9]?(:[0-9][0-9])?( ?(a|p)m)?)";
  const matcher = new RegExp(timeRegex, "ig");
  const results = matcher.exec(text);

  if (results !== null) {
    const time = results[2];
    const parts = time.split(":");
    let hours = parseInt(parts[0]);
    let minutes = 0;
    if (time.toLowerCase().endsWith("pm")) {
      if (hours !== 12) {
        hours += 12;
      }
    } else if (time.toLowerCase().endsWith("am") && hours === 12) {
      hours = 0;
    }
    if (parts.length > 1) {
      minutes = parseInt(parts[1]);
    }

    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);
    date.setMilliseconds(0);
  }

  const replace = results !== null ? results[0] : previousMatch;
  return {
    newText: replaceAll(text, replace, "").trim(),
    date,
  };
};

export const getDateFromText = (text: string, now: Date = new Date()) => {
  const datePatterns: string[] = [
    "(?<found>(?<month>[0-9][0-9]?)\\/(?<day>[0-9][0-9]?)(\\/(?<year>[0-9][0-9]([0-9][0-9])?))?)",
    "(?<found>(?<year>[0-9][0-9][0-9][0-9]?)\\/(?<month>[0-9][0-9]?)\\/(?<day>[0-9][0-9]))",
    "(?<found>(?<year>[0-9][0-9][0-9][0-9]?)-(?<month>[0-9][0-9]?)-(?<day>[0-9][0-9]))",
    "(?<found>(?<day>[0-9][0-9]?)\\.(?<month>[0-9][0-9]?)(\\.(?<year>[0-9][0-9]([0-9][0-9])?))?)",
  ];

  let result: string | null = null;
  let results: RegExpExecArray | null;
  let foundText: string | null = "";
  let containsYear = true;

  for (const datePattern of datePatterns) {
    results = matchDateAtBoundary(text, datePattern);
    if (results !== null) {
      const { day, month, year, found } = { ...results.groups };
      let tmp_year: string | number | undefined = year;

      if (tmp_year === undefined) {
        tmp_year = year ?? now.getFullYear();
        containsYear = false;
      }

      result = `${month}/${day}/${tmp_year}`;
      result = !isNaN(new Date(result).getTime())
        ? result
        : `${day}/${month}/${tmp_year}`;
      result = !isNaN(new Date(result).getTime()) ? result : null;

      if (result !== null) {
        foundText = found;
        break;
      }
    }
  }

  if (result === null) {
    const monthRegex = new RegExp(
      `(^| )(${monthsRegexGroup} [0-9][0-9]?|[0-9][0-9]? ${monthsRegexGroup})`,
      "ig",
    );
    results = monthRegex.exec(text);
    result =
      results === null ? null : `${results[0]} ${now.getFullYear()}`.trim();
    foundText = results === null ? "" : results[0].trim();
    containsYear = false;
  }

  if (result === null) {
    return {
      foundText,
      date: null,
    };
  }

  const date = new Date(result);
  if (isNaN(date.getTime())) {
    return {
      foundText,
      date: null,
    };
  }

  if (!containsYear && date < now) {
    date.setFullYear(date.getFullYear() + 1);
  }

  return {
    foundText,
    date,
  };
};

export const getDateFromTextIn = (text: string, now: Date = new Date()) => {
  const regex = /(in [0-9]+ (hours?|days?|weeks?|months?))/gi;
  const results = regex.exec(text);
  if (results === null) {
    return {
      foundText: "",
      date: null,
    };
  }

  const foundText: string = results[0];
  const date = new Date(now);
  const parts = foundText.split(" ");
  switch (parts[2]) {
    case "hours":
    case "hour":
      date.setHours(date.getHours() + parseInt(parts[1]));
      break;
    case "days":
    case "day":
      date.setDate(date.getDate() + parseInt(parts[1]));
      break;
    case "weeks":
    case "week":
      date.setDate(date.getDate() + parseInt(parts[1]) * 7);
      break;
    case "months":
    case "month":
      date.setMonth(date.getMonth() + parseInt(parts[1]));
      break;
  }

  return {
    foundText,
    date,
  };
};

const getDateFromWeekday = (
  text: string,
  date: Date = new Date(),
): dateFoundResult => {
  const matcher =
    /(^| )(next )?(monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun)($| )/g;
  const results: string[] | null = matcher.exec(text.toLowerCase());
  if (results === null) {
    return {
      foundText: null,
      date: null,
    };
  }

  const currentDay: number = date.getDay();
  let day: number;

  switch (results[3]) {
    case "mon":
    case "monday":
      day = 1;
      break;
    case "tue":
    case "tuesday":
      day = 2;
      break;
    case "wed":
    case "wednesday":
      day = 3;
      break;
    case "thu":
    case "thursday":
      day = 4;
      break;
    case "fri":
    case "friday":
      day = 5;
      break;
    case "sat":
    case "saturday":
      day = 6;
      break;
    case "sun":
    case "sunday":
      day = 0;
      break;
    default:
      return {
        foundText: null,
        date: null,
      };
  }

  const distance: number = (day + 7 - currentDay) % 7;
  date.setDate(date.getDate() + distance);

  let foundText = results[0];
  if (foundText.endsWith(" ")) {
    foundText = foundText.slice(0, foundText.length - 1);
  }

  return {
    foundText: foundText,
    date: date,
  };
};

const getDayFromText = (text: string, now: Date = new Date()) => {
  const matcher = new RegExp(
    "(^| )(([1-2][0-9])|(3[01])|(0?[1-9]))(st|nd|rd|th|\\.)(?=$| at | @ | " +
      monthsRegexGroup +
      ")",
    "ig",
  );
  const results = matcher.exec(text);
  if (results === null) {
    return {
      foundText: null,
      date: null,
    };
  }

  const date = new Date(now);
  const day = parseInt(results[0]);
  date.setDate(day);

  while (date < now) {
    date.setMonth(date.getMonth() + 1);
  }

  if (date.getDate() !== day) {
    date.setDate(day);
  }

  return {
    foundText: results[0],
    date: date,
  };
};

const getMonthFromText = (text: string, date: Date) => {
  const matcher = new RegExp("\\b" + monthsRegexGroup + "\\b", "ig");
  const results = matcher.exec(text);

  if (results === null) {
    return {
      newText: text,
      date,
    };
  }

  const fullDate = new Date(`${results[0]} 1 ${new Date().getFullYear()}`);
  date.setMonth(fullDate.getMonth());
  return {
    newText: replaceAll(text, results[0], ""),
    date,
  };
};

const getDateFromInterval = (interval: number): Date => {
  const newDate = new Date();
  newDate.setDate(newDate.getDate() + interval);
  newDate.setHours(calculateNearestHours(newDate), 0, 0);

  return newDate;
};
