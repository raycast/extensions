/**
 * Fixed-schedule repeats in Amplenote's format: "DTSTART:<first occurrence>\nRRULE:<rule>".
 * Amplenote's MCP only accepts RRULE rules; repeating "when the task is complete" isn't available through it.
 */

export type RepeatPreset = "daily" | "weekdays" | "weekly" | "biweekly" | "monthly" | "yearly";
export type HideRule = "day-due" | "1-day" | "2-days" | "3-days" | "1-week" | "1-month";

export class RepeatError extends Error {}

const PRESETS: Record<RepeatPreset, string> = {
  daily: "FREQ=DAILY",
  weekdays: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
  weekly: "FREQ=WEEKLY",
  biweekly: "FREQ=WEEKLY;INTERVAL=2",
  monthly: "FREQ=MONTHLY",
  yearly: "FREQ=YEARLY",
};

const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Only rule parts this extension can place (first occurrence) and describe (confirmation) correctly.
const SUPPORTED_PARTS: Record<string, RegExp> = {
  FREQ: /^(DAILY|WEEKLY|MONTHLY|YEARLY)$/,
  INTERVAL: /^[1-9]\d*$/,
  BYDAY: /^(MO|TU|WE|TH|FR|SA|SU)(,(MO|TU|WE|TH|FR|SA|SU))*$/,
  BYMONTHDAY: /^([1-9]|[12]\d|3[01])(,([1-9]|[12]\d|3[01]))*$/,
  BYMONTH: /^([1-9]|1[0-2])(,([1-9]|1[0-2]))*$/,
  COUNT: /^[1-9]\d*$/,
  UNTIL: /^\d{8}(T\d{6}Z?)?$/,
};

const pad = (value: number) => String(value).padStart(2, "0");

function dtstart(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

/** The RRULE part of a repeat value in upper case, with or without an "RRULE:" prefix or a DTSTART line. */
function ruleOf(value: string): string {
  const lines = value.split(/\r?\n/).map((part) => part.trim());
  const line = lines.find((part) => /^rrule:/i.test(part)) ?? lines.find((part) => /freq=/i.test(part)) ?? value.trim();
  return line.replace(/^rrule:/i, "").toUpperCase();
}

function ruleParts(value: string): Record<string, string> {
  return Object.fromEntries(
    ruleOf(value)
      .split(";")
      .filter(Boolean)
      .map((part) => part.split("=") as [string, string]),
  );
}

export function buildRepeat(start: Date, preset: RepeatPreset): string {
  return `DTSTART:${dtstart(start)}\nRRULE:${PRESETS[preset]}`;
}

/** Turns a rule from the user or AI into Amplenote's format, anchored at the task's first occurrence. */
export function normalizeRepeat(value: string, start: Date): string {
  const rule = ruleOf(value);
  const parts = ruleParts(value);
  const unsupported = Object.entries(parts).find(([key, part]) => !SUPPORTED_PARTS[key]?.test(part ?? ""));
  if (!parts.FREQ || unsupported) {
    throw new RepeatError(
      `"${value}" is not a repeat rule this extension can set up. Use an RRULE with FREQ (DAILY, WEEKLY, MONTHLY or ` +
        "YEARLY) and optionally INTERVAL, BYDAY (e.g. MO,FR), BYMONTHDAY, BYMONTH, COUNT or UNTIL. " +
        "Repeating a set time after completion isn't possible through Amplenote's MCP.",
    );
  }
  return `DTSTART:${dtstart(start)}\nRRULE:${rule}`;
}

/**
 * Moves an existing rule to a new first occurrence by swapping only its DTSTART. The rule itself is kept as is,
 * so rules created in Amplenote (with parts this extension doesn't create) keep working.
 */
export function reanchorRepeat(stored: string, start: Date): string {
  return `DTSTART:${dtstart(start)}\nRRULE:${ruleOf(stored)}`;
}

/** Moves a start that the rule excludes (e.g. a Saturday for "every Monday") to the first day the rule allows. */
export function firstOccurrence(start: Date, value: string): Date {
  const parts = ruleParts(value);
  const days = parts.BYDAY?.split(",");
  const monthDays = parts.BYMONTHDAY?.split(",").map(Number);
  const months = parts.BYMONTH?.split(",").map(Number);
  if (!days && !monthDays && !months) return start;
  for (let offset = 0; offset <= 400; offset += 1) {
    const candidate = new Date(start);
    candidate.setDate(start.getDate() + offset);
    if (days && !days.includes(DAY_CODES[candidate.getDay()])) continue;
    if (monthDays && !monthDays.includes(candidate.getDate())) continue;
    if (months && !months.includes(candidate.getMonth() + 1)) continue;
    return candidate;
  }
  throw new RepeatError("This repeat rule never produces a date (for example February 30). Check the day and month.");
}

function joinDays(names: string[]): string {
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Plain-language description of every rule part, e.g. "Every week on Monday at 08:30". */
export function describeRepeat(value: string): string {
  const parts = ruleParts(value);
  const interval = Number(parts.INTERVAL ?? 1);
  const anchor = value.match(/DTSTART:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  const anchorDate = anchor ? new Date(+anchor[1], +anchor[2] - 1, +anchor[3]) : undefined;
  const every = (unit: string) => (interval > 1 ? `Every ${interval} ${unit}s` : `Every ${unit}`);
  const days = parts.BYDAY?.split(",");
  const monthDays = parts.BYMONTHDAY?.split(",");
  const months = parts.BYMONTH?.split(",").map((month) => MONTH_NAMES[Number(month) - 1]);

  let text: string;
  switch (parts.FREQ) {
    case "DAILY":
      text = every("day");
      break;
    case "WEEKLY": {
      if (interval === 1 && days?.join(",") === "MO,TU,WE,TH,FR") {
        text = "Every weekday";
        break;
      }
      const names = days
        ? days.map((day) => DAY_NAMES[DAY_CODES.indexOf(day)])
        : anchorDate
          ? [DAY_NAMES[anchorDate.getDay()]]
          : [];
      text = `${every("week")}${names.length ? ` on ${joinDays(names)}` : ""}`;
      break;
    }
    case "MONTHLY":
      text = `${every("month")}${monthDays ? ` on ${monthDays.length > 1 ? "days" : "day"} ${joinDays(monthDays)}` : ""}`;
      break;
    case "YEARLY":
      text =
        months && monthDays
          ? `${every("year")} on ${joinDays(months)} ${joinDays(monthDays)}`
          : `${every("year")}${months ? ` in ${joinDays(months)}` : ""}`;
      break;
    default:
      return ruleOf(value);
  }
  // Parts the base sentence above didn't already cover.
  const coveredMonthDays = parts.FREQ === "MONTHLY" || (parts.FREQ === "YEARLY" && !!months);
  if (parts.FREQ !== "WEEKLY" && days) text += ` on ${joinDays(days.map((day) => DAY_NAMES[DAY_CODES.indexOf(day)]))}`;
  if (monthDays && !coveredMonthDays) text += ` on ${monthDays.length > 1 ? "days" : "day"} ${joinDays(monthDays)}`;
  if (months && parts.FREQ !== "YEARLY") text += ` in ${joinDays(months)}`;
  if (anchor) text += ` at ${anchor[4]}:${anchor[5]}`;
  if (parts.COUNT) text += `, ${parts.COUNT} times`;
  if (parts.UNTIL) {
    const until = new Date(+parts.UNTIL.slice(0, 4), +parts.UNTIL.slice(4, 6) - 1, +parts.UNTIL.slice(6, 8));
    text += `, until ${until.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }
  return text;
}

/** Amplenote's "Hide until" options, as the start of the day relative to the task's start. */
export function hideUntilFor(start: Date, rule: HideRule): number {
  const day = new Date(start);
  day.setHours(0, 0, 0, 0);
  if (rule === "1-month") {
    // Clamp to the last day of the previous month, so Mar 31 becomes Feb 28 instead of rolling over to Mar 3.
    const lastDayOfPreviousMonth = new Date(day.getFullYear(), day.getMonth(), 0).getDate();
    day.setDate(Math.min(day.getDate(), lastDayOfPreviousMonth));
    day.setMonth(day.getMonth() - 1);
  } else {
    day.setDate(day.getDate() - { "day-due": 0, "1-day": 1, "2-days": 2, "3-days": 3, "1-week": 7 }[rule]);
  }
  return Math.floor(day.getTime() / 1000);
}
