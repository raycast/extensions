import { execa } from "execa";
import { TOOL_INFO, TOOLS, ToolId } from "./tools.js";

/** yt-dlp's own "older than 90 days" warning threshold — YouTube breaks older builds well before that. */
export const YTDLP_MAX_AGE_DAYS = 90;

/** How long "Not Now" silences the update prompt for a tool. */
export const SNOOZE_MS = 24 * 60 * 60 * 1000;

/** How long a package-manager check is reused. `brew outdated` can take seconds, too slow for every download. */
export const CHECK_TTL_MS = 6 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The release date encoded in a yt-dlp version (`2026.03.17`, nightly
 * `2026.03.17.232541`, `2026.03.17.post1`, or Homebrew's zero-stripped
 * `2026.3.17`). Undefined when the string isn't a date version.
 */
export function parseYtdlpVersion(version: string): Date | undefined {
  const match = /^(\d{4})\.(\d{1,2})\.(\d{1,2})(?:\.|$)/.exec(version.trim());
  if (!match) return undefined;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  // Date.UTC rolls 2026.02.30 over into March; a real release date round-trips.
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : undefined;
}

/** Whole days between a yt-dlp release and `now`, or undefined for an unreadable version. */
export function ytdlpAgeDays(version: string, now: number): number | undefined {
  const released = parseYtdlpVersion(version);
  return released ? Math.floor((now - released.getTime()) / DAY_MS) : undefined;
}

/** True when the version is older than `maxAgeDays`. An unreadable version is never stale — don't nag on a guess. */
export function isYtdlpStale(version: string, now: number, maxAgeDays: number = YTDLP_MAX_AGE_DAYS): boolean {
  const age = ytdlpAgeDays(version, now);
  return age !== undefined && age > maxAgeDays;
}

/** "45 days" for a couple of months, "6 months" beyond that. */
export function formatAge(days: number): string {
  if (days < 60) return `${days} ${days === 1 ? "day" : "days"}`;
  return `${Math.floor(days / 30)} months`;
}

/** True while a stored snooze timestamp (epoch ms, as text) is still in the future. */
export function isSnoozed(until: string | undefined, now: number): boolean {
  const timestamp = Number(until);
  return Number.isFinite(timestamp) && timestamp > now;
}

/**
 * The version in a tool's `--version` banner ("monolith 2.10.1", "deno 2.9.7
 * (stable…)", "ffmpeg version 8.0.1 Copyright…"). Only the first line counts —
 * ffmpeg's second line is the compiler version.
 */
export function parseVersionOutput(output: string): string | undefined {
  return /\d+(?:\.\d+)+/.exec(output.trimStart().split("\n")[0])?.[0];
}

/** Numeric parts of a version, ignoring a Homebrew `_N` revision suffix. */
function versionParts(version: string): number[] | undefined {
  const parts = version.replace(/_\d+$/, "").match(/\d+/g);
  return parts ? parts.map(Number) : undefined;
}

/**
 * -1, 0 or 1 as `a` is older than, the same as, or newer than `b`. Zero
 * padding (`2026.08.19` vs `2026.8.19`), missing trailing parts and Homebrew
 * rebuild revisions don't count as differences. Undefined if either side has
 * no digits.
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 | undefined {
  const [x, y] = [versionParts(a), versionParts(b)];
  if (!x || !y) return undefined;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const diff = (x[i] ?? 0) - (y[i] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}

/**
 * The tools behind a download's executables, each once. ffprobe ships with
 * ffmpeg; on Windows yt-dlp's winget package bundles both, so ffmpeg isn't a
 * separate update there.
 */
export function toolsToCheck(executables: string[], platform: NodeJS.Platform): ToolId[] {
  const tools = executables
    .map((name) => (name === "ffprobe" ? "ffmpeg" : name))
    .filter((name): name is ToolId => name in TOOLS)
    .filter((tool) => !(platform === "win32" && tool === "ffmpeg"));
  return [...new Set(tools)];
}

/** The package a tool is upgraded as: a Homebrew formula, a winget ID, or the managed spotDL binary. */
export function packageFor(tool: ToolId, platform: NodeJS.Platform): string {
  if (platform === "win32") return TOOLS[tool].wingetId ?? tool;
  return tool;
}

export type PendingUpdate = { tool: ToolId; installed?: string; latest?: string; ageDays?: number };

/**
 * Which tools need an update. A tool is pending when the package manager has a
 * newer version than the one installed (`latest` is the cached check, keyed by
 * tool); a live installed version at or past it — upgraded since the check —
 * clears it. yt-dlp is also pending when it's past the 90-day age limit, which
 * covers installs no package manager knows about.
 */
export function pendingUpdates(
  tools: ToolId[],
  installed: Partial<Record<ToolId, string>>,
  latest: Partial<Record<ToolId, string>>,
  now: number,
): PendingUpdate[] {
  const pending: PendingUpdate[] = [];
  for (const tool of tools) {
    const current = installed[tool];
    const newest = latest[tool];
    // Older, or unreadable (trust the package manager); equal or newer means already upgraded.
    const order = newest && current ? compareVersions(current, newest) : undefined;
    if (newest && (order === -1 || order === undefined)) {
      pending.push({ tool, installed: current, latest: newest });
    } else if (tool === "yt-dlp" && current && isYtdlpStale(current, now)) {
      pending.push({ tool, installed: current, ageDays: ytdlpAgeDays(current, now) });
    }
  }
  return pending;
}

/** One line for the update prompt: "gallery-dl 1.32.1 → 1.32.14", or yt-dlp's age when no newer version is known. */
export function describeUpdate(update: PendingUpdate): string {
  const name = TOOL_INFO[update.tool].name;
  if (update.latest) {
    const latest = update.latest.replace(/_\d+$/, "");
    return update.installed ? `${name} ${update.installed} → ${latest}` : `${name} → ${latest}`;
  }
  return `${name} ${update.installed} (${formatAge(update.ageDays ?? 0)} old)`;
}

/** Cache payload for a package-manager check. */
export function serializeLatest(latest: Partial<Record<ToolId, string>>, now: number): string {
  return JSON.stringify({ checkedAt: now, latest });
}

/** The cached check's newer-version map, or undefined when it's missing, corrupt, expired or from the future. */
export function readCachedLatest(raw: string | undefined, now: number): Partial<Record<ToolId, string>> | undefined {
  if (!raw) return undefined;
  try {
    const { checkedAt, latest } = JSON.parse(raw) as { checkedAt?: unknown; latest?: unknown };
    if (typeof checkedAt !== "number" || typeof latest !== "object" || latest === null) return undefined;
    if (checkedAt > now || now - checkedAt > CHECK_TTL_MS) return undefined;
    return latest as Partial<Record<ToolId, string>>;
  } catch {
    return undefined;
  }
}

/**
 * True when the (symlink-resolved) binary lives in a Homebrew keg or a winget
 * package, i.e. a package manager the extension can upgrade it through.
 * Anything hand-placed or from a custom preference path is left to the user.
 */
export function isPackageManagerInstall(realPath: string, platform: NodeJS.Platform): boolean {
  if (platform === "darwin") return realPath.includes("/Cellar/");
  if (platform === "win32") return /\\WinGet\\/i.test(realPath);
  return false;
}

/** A tool's installed version, read from its version banner; undefined when the binary can't be run. */
export async function getToolVersion(binaryPath: string, tool: ToolId): Promise<string | undefined> {
  try {
    const { stdout } = await execa(binaryPath, [tool === "ffmpeg" ? "-version" : "--version"], { timeout: 10_000 });
    return parseVersionOutput(stdout);
  } catch {
    return undefined;
  }
}
