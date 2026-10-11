import { isRecord, miseJson, MiseOutputError } from "./exec";
import type { MiseLocation } from "./locate";

export type OutdatedTool = {
  name: string;
  requested: string;
  current: string;
  latest: string;
  releaseUrl?: string;
  sourcePath?: string;
};

export function parseOutdated(raw: unknown): OutdatedTool[] {
  if (!isRecord(raw)) {
    throw new MiseOutputError("mise outdated: expected an object keyed by tool", JSON.stringify(raw));
  }
  return Object.entries(raw).map(([name, entry]) => {
    if (
      !isRecord(entry) ||
      typeof entry.requested !== "string" ||
      typeof entry.current !== "string" ||
      typeof entry.latest !== "string" ||
      !isRecord(entry.source)
    ) {
      throw new MiseOutputError(`mise outdated: ${name} is malformed`, JSON.stringify(entry));
    }
    const tool: OutdatedTool = { name, requested: entry.requested, current: entry.current, latest: entry.latest };
    if (typeof entry.release_url === "string") tool.releaseUrl = entry.release_url;
    if (typeof entry.source.path === "string") tool.sourcePath = entry.source.path;
    return tool;
  });
}

export type OutdatedOptions = { bump?: boolean; inactive?: boolean };

export function listOutdated(location: MiseLocation, options: OutdatedOptions = {}): Promise<OutdatedTool[]> {
  const flags = [...(options.bump ? ["--bump"] : []), ...(options.inactive ? ["--inactive"] : [])];
  return miseJson(location, ["outdated", ...flags], parseOutdated);
}

export function outdatedSubtitle(count: number): string {
  return count === 0 ? "All up to date" : `${count} outdated`;
}
