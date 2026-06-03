export interface ParsedTask {
  title: string;
  dueDate?: string;
  priority?: number;
  tags: string[];
  listName?: string;
}

const PRIORITY_KEYWORDS: Record<string, number> = {
  high: 5, "!1": 5,
  medium: 3, "!2": 3,
  low: 1, "!3": 1,
};

const MONTHS_FULL = ["january","february","march","april","may","june","july","august","september","october","november","december"];
const MONTHS_SHORT = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const DAYS_FULL = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
const DAYS_SHORT = ["sun","mon","tue","wed","thu","fri","sat"];

function getAppropriateYear(month: number, day: number): number {
  const now = new Date();
  const year = now.getFullYear();
  const candidate = new Date(year, month, day);
  return candidate < now ? year + 1 : year;
}

function toISO(date: Date): string {
  return date.toISOString().split("T")[0] + "T00:00:00+00:00";
}

function parseDate(token: string): string | null {
  const now = new Date();
  const lower = token.toLowerCase();

  if (lower === "today" || lower === "tod") return toISO(now);
  if (lower === "tomorrow" || lower === "tmr" || lower === "tmrw") {
    now.setDate(now.getDate() + 1);
    return toISO(now);
  }

  let dayIndex = DAYS_FULL.indexOf(lower);
  if (dayIndex === -1) dayIndex = DAYS_SHORT.indexOf(lower);
  if (dayIndex !== -1) {
    const diff = ((dayIndex - now.getDay()) + 7) % 7 || 7;
    now.setDate(now.getDate() + diff);
    return toISO(now);
  }

  const dotEuro = token.match(/^(\d{1,2})\.(\d{1,2})\.?$/);
  if (dotEuro) {
    const day = parseInt(dotEuro[1]);
    const month = parseInt(dotEuro[2]) - 1;
    return toISO(new Date(getAppropriateYear(month, day), month, day));
  }

  const slashUS = token.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (slashUS) {
    const month = parseInt(slashUS[1]) - 1;
    const day = parseInt(slashUS[2]);
    return toISO(new Date(getAppropriateYear(month, day), month, day));
  }

  return null;
}

function parseTwoTokenDate(t1: string, t2: string): string | null {
  const l1 = t1.toLowerCase();
  const l2 = t2.toLowerCase();

  let monthIndex = MONTHS_FULL.indexOf(l1);
  if (monthIndex === -1) monthIndex = MONTHS_SHORT.indexOf(l1);
  if (monthIndex !== -1 && /^\d{1,2}$/.test(l2)) {
    const day = parseInt(l2);
    return toISO(new Date(getAppropriateYear(monthIndex, day), monthIndex, day));
  }

  monthIndex = MONTHS_FULL.indexOf(l2);
  if (monthIndex === -1) monthIndex = MONTHS_SHORT.indexOf(l2);
  if (monthIndex !== -1 && /^\d{1,2}$/.test(l1)) {
    const day = parseInt(l1);
    return toISO(new Date(getAppropriateYear(monthIndex, day), monthIndex, day));
  }

  return null;
}

function isMonthName(token: string): boolean {
  const l = token.toLowerCase();
  return MONTHS_FULL.includes(l) || MONTHS_SHORT.includes(l);
}

function parseTime(token: string, baseDateISO?: string): string | null {
  const match = token.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/i);
  if (!match) return null;
  let hours = parseInt(match[1]);
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const meridiem = match[3]?.toLowerCase();
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  if (!meridiem && hours < 8) hours += 12;
  if (hours > 23) return null;
  const base = baseDateISO ? new Date(baseDateISO) : new Date();
  base.setHours(hours, minutes, 0, 0);
  return base.toISOString();
}

export function parseTaskInput(input: string): ParsedTask {
  const tokens = input.trim().split(/\s+/);
  const titleParts: string[] = [];
  const tags: string[] = [];
  let listName: string | undefined;
  let priority: number | undefined;
  let dateISO: string | undefined;
  let timeISO: string | undefined;

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];

    if (token.startsWith("#") && token.length > 1) { tags.push(token.slice(1)); i++; continue; }
    if (token.startsWith("@") && token.length > 1) { listName = token.slice(1); i++; continue; }

    const lower = token.toLowerCase();
    if (PRIORITY_KEYWORDS[lower] !== undefined) { priority = PRIORITY_KEYWORDS[lower]; i++; continue; }

    if (!dateISO && i + 1 < tokens.length && isMonthName(token)) {
      const twoToken = parseTwoTokenDate(token, tokens[i + 1]);
      if (twoToken) { dateISO = twoToken; i += 2; continue; }
    }
    if (!dateISO && i + 1 < tokens.length && isMonthName(tokens[i + 1])) {
      const twoToken = parseTwoTokenDate(token, tokens[i + 1]);
      if (twoToken) { dateISO = twoToken; i += 2; continue; }
    }

    const d = parseDate(token);
    if (d && !dateISO) { dateISO = d; i++; continue; }

    const t = parseTime(token, dateISO);
    if (t && !timeISO) { timeISO = t; i++; continue; }

    titleParts.push(token);
    i++;
  }

  return { title: titleParts.join(" "), dueDate: timeISO ?? dateISO, priority, tags, listName };
}
