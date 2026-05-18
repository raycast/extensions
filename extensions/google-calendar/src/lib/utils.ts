import { environment, getPreferenceValues } from "@raycast/api";

const SIGNATURE = "Created with <a href='https://raycast.com'>Raycast</a>";

const preferences = getPreferenceValues();

export function roundUpTime(date = new Date(), roundMins = 15) {
  const ms = 1000 * 60 * roundMins;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

export function addSignature(description: string | undefined) {
  if (!preferences.addSignature) {
    return description;
  }

  if (!description) {
    return SIGNATURE;
  }

  return `${description}\n<hr>${SIGNATURE}`;
}

function parseRRule(rrule: string): string {
  // Remove RRULE: prefix if present
  const rule = rrule.replace("RRULE:", "");
  const parts = rule.split(";");
  const ruleObj: Record<string, string> = {};

  parts.forEach((part) => {
    const [key, value] = part.split("=");
    ruleObj[key] = value;
  });

  const freq = ruleObj.FREQ?.toLowerCase() || "";
  const interval = ruleObj.INTERVAL ? parseInt(ruleObj.INTERVAL) : 1;
  const count = ruleObj.COUNT ? parseInt(ruleObj.COUNT) : undefined;
  const until = ruleObj.UNTIL
    ? new Date(`${ruleObj.UNTIL.slice(0, 4)}-${ruleObj.UNTIL.slice(4, 6)}-${ruleObj.UNTIL.slice(6, 8)}`)
    : undefined;

  let humanReadable = "";

  // Handle frequency and interval
  if (interval === 1) {
    humanReadable = `Every ${freq.slice(0, -2)}`;
  } else {
    humanReadable = `Every ${interval} ${freq.slice(0, -2)}s`;
  }

  // Handle end condition
  if (count) {
    humanReadable += `, ${count} times`;
  } else if (until) {
    humanReadable += ` until ${until.toLocaleDateString()}`;
  }

  // Handle specific days for weekly recurrence
  if (freq === "weekly" && ruleObj.BYDAY) {
    const days = ruleObj.BYDAY.split(",").map((day) => {
      const dayMap: Record<string, string> = {
        MO: "Monday",
        TU: "Tuesday",
        WE: "Wednesday",
        TH: "Thursday",
        FR: "Friday",
        SA: "Saturday",
        SU: "Sunday",
      };
      return dayMap[day];
    });

    if (days.length > 0) {
      humanReadable += ` on ${days.join(", ")}`;
    }
  }

  return humanReadable;
}

export function formatRecurrence(recurrence: string[]): string {
  if (!recurrence?.length) return "";

  const rules = recurrence
    .map((rule) => {
      if (rule.startsWith("RRULE:")) {
        return parseRRule(rule);
      } else if (rule.startsWith("EXRULE:")) {
        return `Except ${parseRRule(rule.replace("EXRULE:", ""))}`;
      } else if (rule.startsWith("RDATE:")) {
        const dates = rule
          .replace("RDATE:", "")
          .split(",")
          .map((date) => new Date(date).toLocaleDateString());
        return `Also occurs on ${dates.join(", ")}`;
      } else if (rule.startsWith("EXDATE:")) {
        const dates = rule
          .replace("EXDATE:", "")
          .split(",")
          .map((date) => new Date(date).toLocaleDateString());
        return `Except on ${dates.join(", ")}`;
      }
      return "";
    })
    .filter(Boolean);

  return rules.join("\n");
}

function isInternal() {
  return environment.supportPath.includes("internal");
}

export function getClientId() {
  if (environment.raycastVersion.split(".").length === 4) {
    return isInternal()
      ? "690234628480-ic526rvseca4983uujs693rnqh49kgjh.apps.googleusercontent.com"
      : "690234628480-bhl8vft6dp81bkv4bq0lf9l6vv7nerq4.apps.googleusercontent.com";
  } else {
    return isInternal()
      ? "690234628480-4h8a6h78482ks82g3s1ghrqa0ce8qgo3.apps.googleusercontent.com"
      : "690234628480-bhl8vft6dp81bkv4bq0lf9l6vv7nerq4.apps.googleusercontent.com";
  }
}

export function toISO8601WithTimezoneOffset(date = new Date()) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  const offset = date.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offset) / 60)
    .toString()
    .padStart(2, "0");
  const offsetMinutes = Math.abs(offset % 60)
    .toString()
    .padStart(2, "0");
  const offsetSign = offset <= 0 ? "+" : "-";

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMinutes}`;
}

export function toHumanReadableTime(date = new Date()) {
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

const BASIC_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ANGLE_BRACKET_EMAIL_REGEX = /<([^<>\s@]+@[^\s@<>]+)>/;

function normalizeAttendeeToken(token: string): string {
  return token.trim().replace(/^[,;]+|[,;]+$/g, "");
}

function extractEmailAddress(value: string): string {
  const angleBracketMatch = value.match(ANGLE_BRACKET_EMAIL_REGEX);
  if (angleBracketMatch?.[1]) {
    return angleBracketMatch[1].trim();
  }

  return value;
}

export function parseAttendeeEmails(attendees?: string | string[] | null): {
  emails: string[];
  invalidEntries: string[];
} {
  if (attendees === undefined || attendees === null) {
    return { emails: [], invalidEntries: [] };
  }

  const rawEntries = Array.isArray(attendees) ? attendees : attendees.split(/[,\n;]/);
  const normalizedEntries = rawEntries
    .map((entry) => normalizeAttendeeToken(entry))
    .map((entry) => extractEmailAddress(entry))
    .filter((entry) => entry.length > 0);

  const emails: string[] = [];
  const invalidEntries: string[] = [];

  for (const entry of normalizedEntries) {
    if (BASIC_EMAIL_REGEX.test(entry)) {
      emails.push(entry);
    } else {
      invalidEntries.push(entry);
    }
  }

  return { emails, invalidEntries };
}

const DURATION_SEGMENT_REGEX =
  /(\d+(?:\.\d+)?)\s*(milliseconds?|ms|seconds?|secs?|sec|s|minutes?|mins?|min|m|hours?|hrs?|hr|h|days?|d|weeks?|w)/gi;

export function parseDurationMs(input?: string): number | undefined {
  if (input === undefined) {
    return undefined;
  }

  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed) * 60 * 1000;
  }

  let total = 0;
  let matchCount = 0;
  let consumed = "";

  for (const match of trimmed.matchAll(DURATION_SEGMENT_REGEX)) {
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    consumed += match[0];
    matchCount += 1;

    if (unit === "ms" || unit.startsWith("millisecond")) {
      total += amount;
    } else if (unit === "s" || unit.startsWith("sec")) {
      total += amount * 1000;
    } else if (unit === "m" || unit.startsWith("min")) {
      total += amount * 60 * 1000;
    } else if (unit === "h" || unit.startsWith("hr") || unit.startsWith("hour")) {
      total += amount * 60 * 60 * 1000;
    } else if (unit === "d" || unit.startsWith("day")) {
      total += amount * 24 * 60 * 60 * 1000;
    } else if (unit === "w" || unit.startsWith("week")) {
      total += amount * 7 * 24 * 60 * 60 * 1000;
    } else {
      return undefined;
    }
  }

  if (matchCount === 0) {
    return undefined;
  }

  if (consumed.replace(/\s+/g, "") !== trimmed.replace(/\s+/g, "")) {
    return undefined;
  }

  return total;
}
