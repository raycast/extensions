import { ItemType } from "./types";

export function itemKey(item: { shareId: string; itemId: string }): string {
  return `${item.shareId}-${item.itemId}`;
}

/**
 * "09s · 418 877": the countdown comes first, on two digits, so that the code stays put while the seconds change. Raycast
 * collapses repeated spaces, so en spaces set the dot apart, further than the code's halves are from each other.
 */
export function totpWithCountdown(formattedCode: string, remainingSeconds: number): string {
  return `${monospace(`${String(remainingSeconds).padStart(2, "0")}s`)}\u2002·\u2002${monospace(formattedCode)}`;
}

/**
 * Unicode's mathematical monospace digits and "s" all have the same width, unlike the panel's font, which an extension
 * can't change: a countdown written with them keeps its width every second.
 */
const MONOSPACE: Record<string, string> = Object.fromEntries(
  [..."0123456789s"].map((character, index) => [character, [..."𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿𝚜"][index]]),
);

export function monospace(text: string): string {
  return [...text].map((character) => MONOSPACE[character] ?? character).join("");
}

/** "https://www.example.com/login" or "example.com/login" -> "example.com". Values that aren't URLs are returned unchanged. */
export function hostnameOf(url: string): string {
  try {
    const { hostname } = new URL(toOpenableUrl(url));
    return hostname.replace(/^www\./, "") || url;
  } catch {
    return url;
  }
}

/**
 * Labels for an item's websites: the hostname, plus as much of the path and query string as needed to tell
 * apart websites that share it.
 */
export function websiteLabels(urls: string[]): string[] {
  const levels = urls.map((url) => {
    const host = hostnameOf(url);
    try {
      const { pathname, search, hash } = new URL(toOpenableUrl(url));
      const path = `${host}${pathname.replace(/\/+$/, "")}`;
      return [host, path, `${path}${search}`, `${path}${search}${hash}`];
    } catch {
      return [url];
    }
  });
  return levels.map((options) => {
    const unique = options.find((label, level) => levels.filter((other) => other[level] === label).length < 2);
    return unique ?? options[options.length - 1];
  });
}

/** Proton Pass accepts URLs without a scheme ("example.com"); browsers need one to open them. */
export function toOpenableUrl(url: string): string {
  const hasHostPort = /^(?:localhost|[^/:]+\.[^/:]+|\[[^\]]+\]):\d+(?:[/?#]|$)/i.test(url);
  return !hasHostPort && /^[a-z][a-z\d+.-]*:/i.test(url) ? url : `https://${url}`;
}

const TYPE_LABELS: Record<ItemType, string> = {
  login: "Login",
  note: "Note",
  credit_card: "Credit Card",
  identity: "Identity",
  alias: "Alias",
  ssh_key: "SSH Key",
  wifi: "Wi-Fi",
};

export function formatTypeLabel(type: ItemType): string {
  return TYPE_LABELS[type] ?? type;
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

/** "3 months ago", "yesterday", "just now". */
export function formatRelativeTime(isoDate: string, nowMs: number = Date.now()): string | undefined {
  const time = Date.parse(isoDate);
  if (Number.isNaN(time)) return undefined;

  // Timestamps carry no zone, so a recent edit can look slightly in the future.
  const elapsedSeconds = Math.max(0, Math.round((nowMs - time) / 1000));
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, unitSeconds] of RELATIVE_UNITS) {
    if (elapsedSeconds >= unitSeconds) {
      return formatter.format(-Math.round(elapsedSeconds / unitSeconds), unit);
    }
  }
  return "just now";
}

// Raycast's markdown renderer shows backslash escapes literally in some contexts (e.g. "example\\.com"),
// so only escape characters that actually change inline rendering, plus block markers at line start.
export function escapeMarkdown(value: string): string {
  return value
    .replace(/([\\`*_[\]<>|])/g, "\\$1")
    .replace(/^(\s*)([#>+-])(?=\s)/gm, "$1\\$2")
    .replace(/^(\s*\d+)([.)])(?=\s)/gm, "$1\\$2");
}

/** Renders a plain-text note as markdown, keeping its line breaks. */
export function noteToMarkdown(note: string): string {
  return escapeMarkdown(note).replace(/\r?\n/g, "  \n");
}
