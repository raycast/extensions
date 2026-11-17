import { Color, Icon, Image } from "@raycast/api";
import { IssueInterval, KpiUnit, MeetingPerson, MeetingType, RockStatus, User } from "../api/types";

export interface KpiScoreLike {
  value?: unknown;
  goal?: unknown;
}

// Dates

/** Ninety stores due dates as ISO timestamps; compare on the calendar day only. */
function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Parse a date-only ISO string ("2026-11-05T00:00:00.000Z") as that calendar day in local time. */
/**
 * Ninety stores due dates as the last moment of the day in the user's timezone
 * (e.g. Nov 7 in Mountain time is `2026-11-08T06:59:59.999Z`), so read timestamps as local time.
 * Bare `YYYY-MM-DD` strings are treated as that calendar day.
 */
export function parseDueDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
}

export type DueBucket = "Overdue" | "Today" | "Upcoming" | "No Due Date";
export const DUE_BUCKETS: DueBucket[] = ["Overdue", "Today", "Upcoming", "No Due Date"];

export function dueBucket(value?: string): DueBucket {
  const due = parseDueDate(value);
  if (!due) return "No Due Date";
  const today = startOfDay(new Date()).getTime();
  const day = startOfDay(due).getTime();
  if (day < today) return "Overdue";
  if (day === today) return "Today";
  return "Upcoming";
}

export function formatDate(value?: string, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  const date = parseDueDate(value);
  return date ? date.toLocaleDateString(undefined, options) : "";
}

export function formatDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Form date pickers give local midnight; send it as the same calendar day at 00:00 UTC like Ninety does. */
/** End of the given local calendar day, matching how the Ninety app saves due dates. */
export function toNinetyDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).toISOString();
}

/** Converts an AI-supplied `YYYY-MM-DD` (or any date string) to a Ninety due date. */
export function dateStringToNinetyDate(value?: string) {
  const date = parseDueDate(value);
  return date ? toNinetyDate(date) : undefined;
}

export function endOfCurrentQuarter() {
  const now = new Date();
  const quarterEndMonth = Math.floor(now.getMonth() / 3) * 3 + 2;
  return new Date(now.getFullYear(), quarterEndMonth + 1, 0);
}

export function currentQuarter(): "Q1" | "Q2" | "Q3" | "Q4" {
  return `Q${Math.floor(new Date().getMonth() / 3) + 1}` as "Q1" | "Q2" | "Q3" | "Q4";
}

export function dueDateAccessory(value?: string, done = false) {
  if (!value) return undefined;
  const bucket = dueBucket(value);
  const color = done
    ? Color.SecondaryText
    : bucket === "Overdue"
      ? Color.Red
      : bucket === "Today"
        ? Color.Orange
        : undefined;
  return {
    date: parseDueDate(value),
    tooltip: `Due ${formatDate(value, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}`,
    icon: { source: Icon.Calendar, tintColor: color },
  };
}

// People

export function personName(person?: Pick<User, "firstName" | "lastName" | "primaryEmail"> | MeetingPerson) {
  if (!person) return "";
  const name = [person.firstName, person.lastName].filter(Boolean).join(" ");
  return name || person.primaryEmail || "";
}

// Rocks

export const ROCK_STATUSES: { value: RockStatus; title: string; color: Color; icon: Image.ImageLike }[] = [
  {
    value: "ON_TRACK",
    title: "On Track",
    color: Color.Green,
    icon: { source: Icon.CircleProgress75, tintColor: Color.Green },
  },
  {
    value: "OFF_TRACK",
    title: "Off Track",
    color: Color.Red,
    icon: { source: Icon.ExclamationMark, tintColor: Color.Red },
  },
  { value: "DONE", title: "Done", color: Color.Blue, icon: { source: Icon.CheckCircle, tintColor: Color.Blue } },
  {
    value: "CANCELED",
    title: "Canceled",
    color: Color.SecondaryText,
    icon: { source: Icon.XMarkCircle, tintColor: Color.SecondaryText },
  },
  {
    value: "DRAFT",
    title: "Draft",
    color: Color.SecondaryText,
    icon: { source: Icon.Pencil, tintColor: Color.SecondaryText },
  },
];

export function rockStatus(status: RockStatus) {
  return ROCK_STATUSES.find((s) => s.value === status) ?? ROCK_STATUSES[0];
}

// Issues

export function intervalTitle(interval?: IssueInterval) {
  return interval === "LONG_TERM" ? "Long-Term" : "Short-Term";
}

export function priorityAccessory(priority?: number) {
  if (!priority) return undefined;
  const color = priority >= 4 ? Color.Red : priority === 3 ? Color.Orange : Color.Yellow;
  return { tag: { value: `P${priority}`, color }, tooltip: `Priority ${priority} of 5 (5 is highest)` };
}

// Meetings

const MEETING_TYPES: Record<MeetingType, string> = {
  level10: "Weekly (Level 10)",
  quarterly: "Quarterly",
  annualDayOne: "Annual — Day 1",
  annualDayTwo: "Annual — Day 2",
  focusDay: "Focus Day",
  visionBuildingDayOne: "Vision Building — Day 1",
  visionBuildingDayTwo: "Vision Building — Day 2",
  weeklyOneOnOne: "Weekly 1-on-1",
  custom: "Custom",
  other: "Other",
};

export function meetingTypeTitle(type: MeetingType) {
  return MEETING_TYPES[type] ?? type;
}

export function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

// Scorecard

/** Scores, goals and averages are loosely typed in the API: a number, a string, or an object holding one. */
export function numericValue(value: unknown): number | undefined {
  if (typeof value === "number" && isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && !isNaN(Number(value))) return Number(value);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["value", "score", "goal", "target"]) {
      const nested = numericValue(record[key]);
      if (nested !== undefined) return nested;
    }
  }
  return undefined;
}

const CURRENCY_SYMBOL: Record<string, string> = { dollar: "$", euro: "€", pound: "£" };

export function formatKpiValue(value: unknown, unit: KpiUnit): string {
  if (value === null || value === undefined) return "—";
  const number = numericValue(value);
  if (number === undefined) return typeof value === "string" ? value : "—";
  switch (unit) {
    case "percentage":
      return `${number.toLocaleString()}%`;
    case "yesno":
      return number ? "Yes" : "No";
    case "dollar":
    case "euro":
    case "pound":
      return `${CURRENCY_SYMBOL[unit]}${number.toLocaleString()}`;
    default:
      return number.toLocaleString();
  }
}

/** Goals can be a single number or a range/operator object; render whatever is there. */
export function formatGoal(goal: unknown, unit: KpiUnit): string {
  if (goal === null || goal === undefined) return "—";
  if (typeof goal !== "object") return formatKpiValue(goal, unit);
  const record = goal as Record<string, unknown>;
  const range = goalRange(record);
  if (range) {
    const text = `${formatKpiValue(range.min, unit)} – ${formatKpiValue(range.max, unit)}`;
    return range.outside ? `Outside ${text}` : text;
  }
  const operator = goalOperator(record);
  const value = numericValue(goal);
  if (value === undefined) return "—";
  const symbol = operatorSymbol(operator);
  return `${symbol ? symbol + " " : ""}${formatKpiValue(value, unit)}`;
}

/** Ninety sends goals like `{ orientation: "gte", value: 13 }`; older shapes used `operator` or `type`. */
function goalOperator(record: Record<string, unknown>) {
  const value = record.orientation ?? record.operator ?? record.type;
  return typeof value === "string" ? value : "";
}

/**
 * A goal's min/max only count when its orientation is "inside" or "outside". Ninety keeps leftover
 * min/max values (often 0 and 0) on ordinary goals like `{ orientation: "gte", value: 4 }`.
 */
function goalRange(record: Record<string, unknown>) {
  const orientation = goalOperator(record).toLowerCase();
  const min = numericValue(record.min ?? record.minValue);
  const max = numericValue(record.max ?? record.maxValue);
  if (min === undefined || max === undefined) return undefined;
  if (orientation === "inside" || orientation === "between") return { min, max, outside: false };
  if (orientation === "outside") return { min, max, outside: true };
  // No orientation at all: an older range-only goal.
  if (!orientation && record.value === undefined) return { min, max, outside: false };
  return undefined;
}

function operatorSymbol(operator: string) {
  const op = operator.toLowerCase();
  if (["gte", ">=", "greaterthanorequal", "greaterorequal", "atleast"].includes(op)) return "≥";
  if (["gt", ">", "greaterthan"].includes(op)) return ">";
  if (["lte", "<=", "lessthanorequal", "lessorequal", "atmost"].includes(op)) return "≤";
  if (["lt", "<", "lessthan"].includes(op)) return "<";
  if (["eq", "=", "==", "equal", "equals"].includes(op)) return "=";
  return "";
}

/** Green/red only when the goal is clear enough to judge; otherwise undefined (neutral). */
export function scoreMeetsGoal(score: KpiScoreLike, unit: KpiUnit): boolean | undefined {
  const value = numericValue(score.value);
  if (value === undefined || score.goal === null || score.goal === undefined) return undefined;
  if (typeof score.goal !== "object") {
    const goal = numericValue(score.goal);
    return goal === undefined ? undefined : unit === "yesno" ? value === goal : value >= goal;
  }
  const record = score.goal as Record<string, unknown>;
  const range = goalRange(record);
  if (range) {
    const inside = value >= range.min && value <= range.max;
    return range.outside ? !inside : inside;
  }
  const goal = numericValue(score.goal);
  if (goal === undefined) return undefined;
  const symbol = operatorSymbol(goalOperator(record));
  switch (symbol) {
    case "≥":
      return value >= goal;
    case ">":
      return value > goal;
    case "≤":
      return value <= goal;
    case "<":
      return value < goal;
    case "=":
      return value === goal;
    default:
      return undefined;
  }
}

// Text

/** Ninety descriptions can be HTML. Turn them into plain text for Raycast markdown. */
function decodeEntities(text: string) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Plain text from Ninety's rich-text HTML, for form fields and AI tool output. */
export function htmlToText(html?: string): string {
  if (!html) return "";
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h[1-6])>/gi, "\n\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Markdown from Ninety's rich-text HTML, for detail panes: keeps links, bold, italics, headings
 * and lists. Text that isn't Markdown on purpose (like "# of days…") is escaped so it doesn't
 * turn into a heading or list.
 */
export function htmlToMarkdown(html?: string): string {
  if (!html) return "";
  if (!/<[a-z][\s\S]*>/i.test(html)) return escapeMarkdownLines(decodeEntities(html)).trim();
  const markdown = html
    .replace(/\r?\n/g, " ")
    .replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, label: string) => {
      const text = label.replace(/<[^>]+>/g, "").trim() || href;
      return `[${text.replace(/[[\]]/g, "\\$&")}](${href.replace(/\)/g, "%29").replace(/ /g, "%20")})`;
    })
    .replace(/<(strong|b)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (_, _tag, _attrs, inner: string) =>
      inner.trim() ? `**${inner.trim()}**` : "",
    )
    .replace(/<(em|i)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (_, _tag, _attrs, inner: string) =>
      inner.trim() ? `_${inner.trim()}_` : "",
    )
    .replace(/<(s|strike|del)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (_, _tag, _attrs, inner: string) => `~~${inner}~~`)
    .replace(
      /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi,
      (_, level: string, inner: string) => `\n\n${"#".repeat(Math.min(Number(level) + 2, 6))} ${inner}\n\n`,
    )
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/(ul|ol)>/gi, "\n\n")
    .replace(/<\/(p|div|blockquote)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(escapeMarkdownLines(markdown))
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Escapes a line-leading "#" (e.g. "# of days…") unless it's a heading we produced. */
function escapeMarkdownLines(text: string) {
  return text.replace(/^(\s*)#(?!#* \S)/gm, "$1\\#").replace(/^(\s*)# (?=\S)/gm, "$1\\# ");
}

export function compact<T>(items: (T | undefined | null | false)[]): T[] {
  return items.filter((item): item is T => !!item);
}
