import { isRecord, miseJson, MiseOutputError } from "./exec";
import type { MiseLocation } from "./locate";

export type OutdatedVersion = {
  name: string;
  requested: string;
  // mise reports current as null when the requested version is not installed.
  current?: string;
  latest: string;
  releaseUrl?: string;
  sourcePath?: string;
};

// An entry whose shape this extension does not recognise. It stays listed so the count stays
// true and Upgrade, which needs only the name, still works.
export type MalformedOutdated = { name: string; malformed: true };

export type OutdatedTool = OutdatedVersion | MalformedOutdated;

// mise names a tool it couldn't check by its full backend and installed version, so `name` is
// `asdf:unreachable` where the JSON key for the same tool would be `unreachable`.
export type UncheckedTool = { name: string; version: string };

export type OutdatedResult = { tools: OutdatedTool[]; unchecked: UncheckedTool[] };

export function parseOutdated(raw: unknown, stderr = ""): OutdatedResult {
  return { tools: parseOutdatedTools(raw), unchecked: parseUnchecked(stderr) };
}

function parseOutdatedTools(raw: unknown): OutdatedTool[] {
  if (!isRecord(raw)) {
    throw new MiseOutputError("mise outdated: expected an object keyed by tool", JSON.stringify(raw));
  }
  return Object.entries(raw).map(([name, entry]): OutdatedTool => {
    if (
      !isRecord(entry) ||
      typeof entry.requested !== "string" ||
      (entry.current !== null && typeof entry.current !== "string") ||
      typeof entry.latest !== "string" ||
      !isRecord(entry.source)
    ) {
      console.error(`mise outdated: ${name} is malformed`, JSON.stringify(entry));
      return { name, malformed: true };
    }
    const tool: OutdatedVersion = { name, requested: entry.requested, latest: entry.latest };
    if (typeof entry.current === "string") tool.current = entry.current;
    if (typeof entry.release_url === "string") tool.releaseUrl = entry.release_url;
    if (typeof entry.source.path === "string") tool.sourcePath = entry.source.path;
    return tool;
  });
}

export function outdatedVersions(tool: OutdatedTool): string {
  if ("malformed" in tool) return "unreadable mise outdated entry";
  return `${tool.current ?? "not installed"} → ${tool.latest}`;
}

// Since 2026.10.24 (jdx/mise#15171) mise leaves a tool whose latest-version lookup failed out of the
// JSON, exactly as if it were current, and names it only in this warning:
//   mise WARN  Could not check 2 tools for updates: asdf:unreachable@1.0.0, asdf:broken@1.0.0
// Older mise prints no warning, so nothing is unchecked.
const UNCHECKED_WARNING = /Could not check \d+ tools? for updates: (.+)$/m;

export function parseUnchecked(stderr: string): UncheckedTool[] {
  const match = UNCHECKED_WARNING.exec(stderr);
  if (!match) return [];
  return match[1]
    .trim()
    .split(", ")
    .map((entry) => {
      // The last @ starts the version, so a scoped package such as npm:@scope/pkg keeps its name.
      const at = entry.lastIndexOf("@");
      return at > 0 ? { name: entry.slice(0, at), version: entry.slice(at + 1) } : { name: entry, version: "" };
    });
}

// `global` checks only the global and system config. mise added --global in this release and rejects
// it alongside --inactive, which reaches past the config to whatever is installed.
export const GLOBAL_FLAG_SINCE = "2026.10.7";

export type OutdatedOptions = { bump?: boolean; inactive?: boolean; global?: boolean };

export function listOutdated(location: MiseLocation, options: OutdatedOptions = {}): Promise<OutdatedResult> {
  const flags = [
    ...(options.global ? ["--global"] : []),
    ...(options.bump ? ["--bump"] : []),
    ...(options.inactive ? ["--inactive"] : []),
  ];
  return miseJson(location, ["outdated", ...flags], parseOutdated);
}

// useCachedPromise can hand back a value cached by an earlier release, which stored a bare OutdatedTool[].
export function currentOutdated(cached: unknown): OutdatedResult | undefined {
  return isRecord(cached) && Array.isArray(cached.tools) && Array.isArray(cached.unchecked)
    ? (cached as OutdatedResult)
    : undefined;
}

export function outdatedSubtitle({ tools, unchecked }: OutdatedResult): string {
  if (unchecked.length === 0) return tools.length === 0 ? "All up to date" : `${tools.length} outdated`;
  const notChecked = `${unchecked.length} unchecked`;
  return tools.length === 0 ? notChecked : `${tools.length} outdated, ${notChecked}`;
}
