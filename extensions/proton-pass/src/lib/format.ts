import { ItemType } from "./types";

export function itemKey(item: { shareId: string; itemId: string }): string {
  return `${item.shareId}-${item.itemId}`;
}

/** "https://www.example.com/login" -> "example.com". Values that aren't URLs are returned unchanged. */
export function hostnameOf(url: string): string {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, "") || url;
  } catch {
    return url;
  }
}

/** Proton Pass accepts URLs without a scheme ("example.com"); browsers need one to open them. */
export function toOpenableUrl(url: string): string {
  return /^[a-z][a-z\d+.-]*:/i.test(url) ? url : `https://${url}`;
}

/**
 * Favicon from DuckDuckGo's icon service, which answers 404 when a site has no icon so that the
 * fallback icon is shown. The service receives the domain, so callers only use it when enabled.
 */
export function websiteIconUrl(url: string): string | undefined {
  try {
    const { hostname } = new URL(toOpenableUrl(url));
    return hostname ? `https://icons.duckduckgo.com/ip3/${hostname}.ico` : undefined;
  } catch {
    return undefined;
  }
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
    .replace(/^(\s*\d+)\.(?=\s)/gm, "$1\\.");
}

/** Renders a plain-text note as markdown, keeping its line breaks. */
export function noteToMarkdown(note: string): string {
  return escapeMarkdown(note).replace(/\r?\n/g, "  \n");
}
