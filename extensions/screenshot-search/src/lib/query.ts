export type SearchQuery = {
  name?: string;
  text?: string;
  date?: string;
  freeText: string;
};

export type SearchableItem = {
  name: string;
  path: string;
  capturedAt: number;
  text?: string;
};

const FILTER_PATTERN = /\b(name|text|date):/gi;

/** Parse the prefix filters used by the command's search bar. */
export function parseSearchQuery(input: string): SearchQuery {
  const query: SearchQuery = { freeText: "" };
  const matches = Array.from(input.matchAll(FILTER_PATTERN));

  if (matches.length === 0) {
    return { freeText: input.trim() };
  }

  const freeText: string[] = [];
  let cursor = 0;

  matches.forEach((match, index) => {
    const matchStart = match.index ?? 0;
    const before = input.slice(cursor, matchStart).trim();
    if (before) freeText.push(before);

    const valueStart = matchStart + match[0].length;
    const valueEnd = matches[index + 1]?.index ?? input.length;
    const rawValue = input.slice(valueStart, valueEnd).trim();
    const quoted = rawValue.startsWith('"') && rawValue.endsWith('"');
    const filter = match[1].toLowerCase() as "name" | "text" | "date";
    let value = stripQuotes(rawValue);

    if (filter === "date" && !quoted) {
      const split = splitDateFilter(value);
      value = split.value;
      if (split.rest) freeText.push(split.rest);
    }

    if (value) {
      query[filter] = query[filter] ? `${query[filter]} ${value}` : value;
    }
    cursor = valueEnd;
  });

  const trailing = input.slice(cursor).trim();
  if (trailing) freeText.push(trailing);

  query.freeText = freeText.join(" ").trim();
  return query;
}

export function needsTextSearch(query: SearchQuery): boolean {
  return Boolean(query.text || query.freeText);
}

export function filterItems<T extends SearchableItem>(
  items: T[],
  query: SearchQuery,
  now = Date.now(),
): T[] {
  const nameFilter = query.name?.toLocaleLowerCase();
  const textFilter = query.text?.toLocaleLowerCase();
  const freeTerms = query.freeText
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  return items.filter((item) => {
    const name = item.name.toLocaleLowerCase();
    const text = item.text?.toLocaleLowerCase() ?? "";
    const searchable = `${name}\n${text}`;

    if (nameFilter && !name.includes(nameFilter)) return false;
    if (textFilter && !text.includes(textFilter)) return false;
    if (query.date && !matchesDate(item.capturedAt, query.date, now))
      return false;
    if (freeTerms.some((term) => !searchable.includes(term))) return false;

    return true;
  });
}

export function matchesDate(
  timestamp: number,
  expression: string,
  now = Date.now(),
): boolean {
  const value = expression.trim().toLocaleLowerCase();
  const date = new Date(timestamp);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  if (value === "today") return date >= startOfToday;
  if (value === "yesterday") {
    const start = new Date(startOfToday);
    start.setDate(start.getDate() - 1);
    return date >= start && date < startOfToday;
  }

  const duration = parseDuration(value);
  if (duration !== undefined)
    return timestamp >= now - duration && timestamp <= now;

  const calendarPeriod = value.match(/^(this|last) (week|month|year)$/);
  if (calendarPeriod) {
    const start = new Date(startOfToday);
    if (calendarPeriod[2] === "week") {
      const day = start.getDay() || 7;
      start.setDate(start.getDate() - day + 1);
      if (calendarPeriod[1] === "last") start.setDate(start.getDate() - 7);
    } else if (calendarPeriod[2] === "month") {
      start.setDate(1);
      if (calendarPeriod[1] === "last") start.setMonth(start.getMonth() - 1);
    } else {
      start.setMonth(0, 1);
      if (calendarPeriod[1] === "last")
        start.setFullYear(start.getFullYear() - 1);
    }
    const end = new Date(start);
    if (calendarPeriod[2] === "week") end.setDate(end.getDate() + 7);
    if (calendarPeriod[2] === "month") end.setMonth(end.getMonth() + 1);
    if (calendarPeriod[2] === "year") end.setFullYear(end.getFullYear() + 1);
    return date >= start && date < end;
  }

  const parsed = parseDate(value);
  if (!parsed) return false;

  const start = new Date(parsed);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return date >= start && date < end;
}

function parseDuration(value: string): number | undefined {
  const match = value.match(
    /^(?:last|past|within)\s+(\d+)\s+(day|days|week|weeks|month|months|year|years)$/,
  );
  if (!match) return undefined;

  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier = unit.startsWith("day")
    ? 1
    : unit.startsWith("week")
      ? 7
      : unit.startsWith("month")
        ? 30
        : 365;
  return amount * multiplier * 24 * 60 * 60 * 1000;
}

function parseDate(value: string): Date | undefined {
  const localDate = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (localDate) {
    const year = Number(localDate[1]);
    const month = Number(localDate[2]);
    const day = Number(localDate[3]);
    const parsed = new Date(0);
    parsed.setHours(0, 0, 0, 0);
    parsed.setFullYear(year, month - 1, day);

    return parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
      ? parsed
      : undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function splitDateFilter(value: string): { value: string; rest?: string } {
  const match = value.match(
    /^(today|yesterday|(?:last|this)\s+(?:week|month|year)|(?:last|past|within)\s+\d+\s+(?:days?|weeks?|months?|years?)|\d{4}-\d{2}-\d{2})(?:\s+(.+))?$/i,
  );
  return match ? { value: match[1], rest: match[2] } : { value };
}

function stripQuotes(value: string): string {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).trim();
  }
  return value;
}
