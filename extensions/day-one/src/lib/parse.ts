// Pure helpers with no @raycast/api import, so `npm test` can run them under plain Node.

/** The oldest CLI release this extension was built and tested against. */
export const MIN_CLI_VERSION = "0.22.1";

/** Reads `dayone 0.22.1` (the CLI's `--version` line). Returns null for anything else, including the legacy Mac CLI. */
export function parseCliVersion(output: string): string | null {
  const match = /^dayone (\d+\.\d+\.\d+)\s*$/m.exec(output.trim());
  return match ? match[1] : null;
}

export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** True when a symlink target (or file path) belongs to the Day One Mac app, which is where the legacy CLI lives. */
export function isLegacyCliTarget(target: string): boolean {
  return target.includes("Day One.app/");
}

export type ErrorKind = "keychain" | "auth" | "encryption-key" | "search-model" | "other";

/** Sorts a CLI failure into the cases the UI explains differently. Matches the CLI's own error text. */
export function classifyCliError(message: string): ErrorKind {
  const text = message.toLowerCase();
  if (text.includes("keychain access requires user interaction")) return "keychain";
  if (text.includes("embedding model")) return "search-model";
  if (text.includes("no auth session") || text.includes("dayone auth login")) return "auth";
  if (text.includes("dayone auth key-set") || text.includes("encryption key")) return "encryption-key";
  return "other";
}

export type SyncProgress = {
  /** Entries written to the local store so far in this run. */
  entries: number;
  /** Journals whose entries have finished downloading. */
  journalsDone: number;
  /** Journals whose entries have started downloading. */
  journalsStarted: number;
  finished: boolean;
  status?: string;
};

/**
 * Reads the CLI's `[sync]` progress lines (stderr). Only the journal count and running entry total are
 * kept: the lines carry journal IDs, which are never shown or logged.
 */
export function parseSyncProgress(log: string): SyncProgress {
  const progress: SyncProgress = { entries: 0, journalsDone: 0, journalsStarted: 0, finished: false };
  const pageTotals = new Map<string, number>();
  for (const line of log.split("\n")) {
    if (!line.startsWith("[sync] ")) continue;
    const key = /key=(entries:\S+)/.exec(line)?.[1];
    if (key && line.includes("resource start")) progress.journalsStarted++;
    if (key && line.includes("resource done")) progress.journalsDone++;
    const total = /changed_count_total=(\d+)/.exec(line);
    if (key && total) pageTotals.set(key, Number(total[1]));
    const completed = /^\[sync\] completed run_id=\S+ status=(\S+)/.exec(line);
    if (completed) {
      progress.finished = true;
      progress.status = completed[1];
    }
  }
  for (const count of pageTotals.values()) progress.entries += count;
  return progress;
}

/** Day One stores images as `![](dayone-moment://…)`; those can't render outside the app. */
export function cleanBody(body: string): string {
  return body
    .replace(/!\[[^\]]*\]\(dayone-moment:[^)]*\)/g, "")
    .replace(/\\([.!()[\]#*_-])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** One line of Markdown as plain text: images dropped, links reduced to their text, emphasis marks removed. */
function plainInline(line: string): string {
  return line
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<(https?:\/\/[^>\s]+)>/g, "$1")
    .replace(/~~/g, "")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The first non-empty line of an entry, as plain text. */
export function entryTitle(body: string, fallback = "Untitled Entry"): string {
  for (const raw of cleanBody(body).split("\n")) {
    const line = plainInline(raw.replace(/^#+\s*/, ""));
    if (line) return line.length > 120 ? `${line.slice(0, 119)}…` : line;
  }
  return fallback;
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? one : many}`;
}

/** Finds `"command": "dayone"` + an `"mcp"` arg in an MCP client config. Returns the server names that need changing. */
export function findLegacyMcpServers(config: unknown): string[] {
  const found: string[] = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const servers = (node as Record<string, unknown>).mcpServers;
    if (servers && typeof servers === "object") {
      for (const [name, server] of Object.entries(servers as Record<string, unknown>)) {
        const s = server as { command?: unknown; args?: unknown };
        const command = typeof s.command === "string" ? s.command : "";
        const args = Array.isArray(s.args) ? s.args : [];
        const isDayOne = command === "dayone" || command.endsWith("/dayone");
        if (isDayOne && args.includes("mcp")) found.push(name);
      }
    }
    for (const value of Object.values(node as Record<string, unknown>)) visit(value);
  };
  visit(config);
  return [...new Set(found)];
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** True when `text` contains `query` as a whole word, ignoring case: the same test as the CLI's keyword match. */
export function mentions(text: string, query: string): boolean {
  const term = query.trim();
  if (!term) return false;
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(term)}($|[^\\p{L}\\p{N}])`, "iu").test(text);
}

export type Place = {
  name?: string;
  locality?: string;
  area?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
};

/** "Blue Bottle, Oakland, CA": the most specific parts first, without repeats. */
export function placeLabel(place: Place): string {
  const parts = [place.name, place.locality, place.area, place.country].filter((p): p is string => Boolean(p?.trim()));
  return [...new Set(parts)].slice(0, 3).join(", ");
}

/** A maps link that opens Apple Maps on a Mac and Google Maps on Windows. */
export function mapsUrl(place: Place, platform: string): string | undefined {
  const hasCoords = typeof place.latitude === "number" && typeof place.longitude === "number";
  const label = placeLabel(place);
  if (!hasCoords && !label) return undefined;
  if (platform === "darwin") {
    const params = new URLSearchParams();
    if (hasCoords) params.set("ll", `${place.latitude},${place.longitude}`);
    if (label) params.set("q", label);
    return `https://maps.apple.com/?${params}`;
  }
  const query = hasCoords ? `${place.latitude},${place.longitude}` : label;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Signing out deletes the CLI's local database, so it is allowed only when the outbox count is a confirmed zero.
 * Anything else, including a count the CLI didn't report, blocks it.
 */
export function canSignOut(outboxTotal: unknown): boolean {
  return outboxTotal === 0;
}

/** The subcommand of a CLI invocation, such as "search entries": never the arguments after it. */
export function subcommand(args: string[]): string {
  return args
    .filter((a) => !a.startsWith("-"))
    .slice(0, 2)
    .join(" ");
}

/** The entry's time zone if the runtime knows it. The CLI can return null, and an unknown zone makes date formatting throw. */
export function timeZoneOrUndefined(zone: unknown): string | undefined {
  if (typeof zone !== "string" || !zone) return undefined;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return zone;
  } catch {
    return undefined;
  }
}

/** What Add Entry keeps after a save. Text typed after the saved entry stays; if the saved part itself changed, everything stays, so nothing typed is lost. */
export function unsavedRemainder(saved: string, current: string): string {
  if (current === saved) return "";
  return current.startsWith(saved) ? current.slice(saved.length).trimStart() : current;
}
