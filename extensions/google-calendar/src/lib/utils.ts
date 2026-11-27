import { environment, getPreferenceValues } from "@raycast/api";
import { calendar_v3 } from "@googleapis/calendar";
import { addRaycastSignature } from "./event-values";

const preferences = getPreferenceValues();

export const isMacOS = process.platform === "darwin";

export function roundUpTime(date = new Date(), roundMins = 15) {
  const ms = 1000 * 60 * roundMins;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

export function addSignature(description: string | undefined) {
  return addRaycastSignature(description, Boolean(preferences.addSignature));
}

function parseRRule(rrule: string): string {
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

  if (interval === 1) {
    humanReadable = `Every ${freq.slice(0, -2)}`;
  } else {
    humanReadable = `Every ${interval} ${freq.slice(0, -2)}s`;
  }

  if (count) {
    humanReadable += `, ${count} times`;
  } else if (until) {
    humanReadable += ` until ${until.toLocaleDateString()}`;
  }

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

/**
 * Whether the user can change their RSVP response on this event via an
 * attendee patch. Only regular invitations qualify: the user must be an
 * attendee (not the organizer), the event must not be cancelled, and the
 * event must be a regular (default) event. Special event types such as
 * birthdays, focus time, out-of-office, or working locations reject attendee
 * patches with e.g. "Attempt made to modify 'birthday' event in a way that is
 * not valid for this event type."
 */
export function canChangeResponseStatus(event: calendar_v3.Schema$Event): boolean {
  if (!event.id || event.status === "cancelled") {
    return false;
  }
  if (!event.attendees?.some((attendee) => attendee.self)) {
    return false;
  }
  return !event.eventType || event.eventType === "default";
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
  return isInternal()
    ? "690234628480-4h8a6h78482ks82g3s1ghrqa0ce8qgo3.apps.googleusercontent.com"
    : "690234628480-bhl8vft6dp81bkv4bq0lf9l6vv7nerq4.apps.googleusercontent.com";
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

/** Google Calendar's named event colors mapped to their API `colorId` values. */
export const EVENT_COLORS = {
  lavender: "1",
  sage: "2",
  grape: "3",
  flamingo: "4",
  banana: "5",
  tangerine: "6",
  peacock: "7",
  graphite: "8",
  blueberry: "9",
  basil: "10",
  tomato: "11",
} as const;

export type EventColorName = keyof typeof EVENT_COLORS;

const COLOR_ID_TO_NAME: Record<string, EventColorName> = Object.fromEntries(
  Object.entries(EVENT_COLORS).map(([name, id]) => [id, name as EventColorName]),
);

export function colorIdToName(colorId?: string | number | null): string {
  if (colorId === undefined || colorId === null || String(colorId).trim().length === 0) {
    return "default";
  }

  const id = String(colorId).trim();
  const name = COLOR_ID_TO_NAME[id];
  if (!name) {
    return id;
  }

  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Background hex values for event color IDs, as returned by Google's colors endpoint. */
export const EVENT_COLOR_HEX: Record<string, string> = {
  "1": "#a4bdfc",
  "2": "#7ae7bf",
  "3": "#dbadff",
  "4": "#ff887c",
  "5": "#fbd75b",
  "6": "#ffb878",
  "7": "#46d6db",
  "8": "#e1e1e1",
  "9": "#5484ed",
  "10": "#51b749",
  "11": "#dc2127",
};

function hexToRgb(hex: string): [number, number, number] | undefined {
  const cleaned = hex.trim().replace(/^#/, "");
  const normalized =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned;

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return undefined;
  }

  const int = parseInt(normalized, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function nearestColorId(hex: string): string | undefined {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return undefined;
  }

  let bestId: string | undefined;
  let bestDistance = Infinity;

  for (const [id, paletteHex] of Object.entries(EVENT_COLOR_HEX)) {
    const target = hexToRgb(paletteHex);
    if (!target) {
      continue;
    }

    const distance = (rgb[0] - target[0]) ** 2 + (rgb[1] - target[1]) ** 2 + (rgb[2] - target[2]) ** 2;

    if (distance < bestDistance) {
      bestDistance = distance;
      bestId = id;
    }
  }

  return bestId;
}

/**
 * Accepts a named color, color ID, or hex value; hex values map to the nearest
 * supported palette color because the API does not accept arbitrary event colors.
 */
export function resolveColorId(color?: string | number | null): string | undefined {
  if (color === undefined || color === null) {
    return undefined;
  }

  const value = String(color).trim().toLowerCase();
  if (value.length === 0) {
    return undefined;
  }

  if (/^#?[0-9a-f]{3}$/.test(value) || /^#?[0-9a-f]{6}$/.test(value)) {
    const nearest = nearestColorId(value);
    if (nearest) {
      return nearest;
    }
    throw new Error(`Invalid hex color "${color}".`);
  }

  if (/^\d+$/.test(value)) {
    const id = Number(value);
    if (id >= 1 && id <= 11) {
      return value;
    }
    throw new Error(`Invalid colorId "${color}". Expected a value between 1 and 11.`);
  }

  const aliases: Record<string, EventColorName> = {
    green: "sage",
    purple: "grape",
    violet: "grape",
    red: "tomato",
    orange: "tangerine",
    yellow: "banana",
    blue: "blueberry",
    teal: "peacock",
    cyan: "peacock",
    gray: "graphite",
    grey: "graphite",
    pink: "flamingo",
  };

  const name = (aliases[value] ?? value) as EventColorName;
  const colorId = EVENT_COLORS[name];
  if (!colorId) {
    throw new Error(
      `Invalid color "${color}". Expected a colorId (1–11) or one of: ${Object.keys(EVENT_COLORS).join(", ")}.`,
    );
  }

  return colorId;
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
