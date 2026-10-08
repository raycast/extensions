const BASIC_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ANGLE_BRACKET_EMAIL_REGEX = /<([^<>\s@]+@[^\s@<>]+)>/;

export function parseAttendeeEmails(attendees?: string | string[] | null): {
  emails: string[];
  invalidEntries: string[];
} {
  if (attendees === undefined || attendees === null) return { emails: [], invalidEntries: [] };

  const entries = (Array.isArray(attendees) ? attendees : attendees.split(/[,\n;]/))
    .map((entry) => entry.trim().replace(/^[,;]+|[,;]+$/g, ""))
    .map((entry) => entry.match(ANGLE_BRACKET_EMAIL_REGEX)?.[1]?.trim() ?? entry)
    .filter(Boolean);
  const emails: string[] = [];
  const invalidEntries: string[] = [];
  for (const entry of entries) (BASIC_EMAIL_REGEX.test(entry) ? emails : invalidEntries).push(entry);
  return { emails, invalidEntries };
}

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
  const normalized = cleaned.length === 3 ? [...cleaned].map((character) => character.repeat(2)).join("") : cleaned;
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return undefined;
  const value = Number.parseInt(normalized, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function colorIdToName(colorId?: string | number | null): string {
  const id = colorId === undefined || colorId === null ? "" : String(colorId).trim();
  const name = COLOR_ID_TO_NAME[id];
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : id || "default";
}

export function resolveColorId(color?: string | number | null): string | undefined {
  if (color === undefined || color === null || String(color).trim() === "") return undefined;
  const value = String(color).trim().toLowerCase();
  if (/^#?[0-9a-f]{3}$/.test(value) || /^#?[0-9a-f]{6}$/.test(value)) {
    const rgb = hexToRgb(value);
    if (!rgb) throw new Error(`Invalid hex color "${color}".`);
    let nearest: string | undefined;
    let distance = Number.POSITIVE_INFINITY;
    for (const [id, hex] of Object.entries(EVENT_COLOR_HEX)) {
      const target = hexToRgb(hex)!;
      const candidate = (rgb[0] - target[0]) ** 2 + (rgb[1] - target[1]) ** 2 + (rgb[2] - target[2]) ** 2;
      if (candidate < distance) {
        nearest = id;
        distance = candidate;
      }
    }
    return nearest;
  }
  if (/^\d+$/.test(value)) {
    if (Number(value) >= 1 && Number(value) <= 11) return value;
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
  const colorId = EVENT_COLORS[(aliases[value] ?? value) as EventColorName];
  if (!colorId) {
    throw new Error(
      `Invalid color "${color}". Expected a colorId (1–11) or one of: ${Object.keys(EVENT_COLORS).join(", ")}.`,
    );
  }
  return colorId;
}

export function addRaycastSignature(description: string | undefined, enabled: boolean) {
  if (!enabled) return description;
  const signature = "Created with <a href='https://raycast.com'>Raycast</a>";
  return description ? `${description}\n<hr>${signature}` : signature;
}
