import {
  existsSync,
  readFileSync,
  writeFileSync,
  renameSync,
  statSync,
} from "node:fs";
import { join, isAbsolute } from "node:path";
import type { Configuration, Hit } from "./backend.ts";

export interface Exclusion {
  path: string;
  size: number;
  modified: number;
  canonicalModified?: number;
}
export interface ScopeGroup {
  root: string;
  reason: string;
  canonical?: string;
  files: Exclusion[];
  uncertain?: boolean;
}
export interface ScopeReport {
  version: 1;
  updated: string;
  restored: string[];
  groups: ScopeGroup[];
}
export const within = (path: string, root: string) =>
  path === root || path.startsWith(root + "/");
const reportPath = (config: Configuration) =>
  join(config.index, "scope-report.json");
export const manifestPath = (config: Configuration) =>
  join(config.index, "scope-excluded.json");
export function readScope(config: Configuration): ScopeReport {
  if (!existsSync(reportPath(config)))
    return { version: 1, updated: "", restored: [], groups: [] };
  const report = JSON.parse(
    readFileSync(reportPath(config), "utf8"),
  ) as ScopeReport;
  const validPath = (p: unknown) =>
    typeof p === "string" && isAbsolute(p) && !p.includes("\0");
  if (
    report?.version !== 1 ||
    !Array.isArray(report.restored) ||
    !report.restored.every(validPath) ||
    !Array.isArray(report.groups) ||
    report.groups.some(
      (g) =>
        !validPath(g.root) ||
        typeof g.reason !== "string" ||
        !Array.isArray(g.files) ||
        g.files.some(
          (f) =>
            !validPath(f.path) ||
            !within(f.path, g.root) ||
            !Number.isFinite(f.size) ||
            !Number.isFinite(f.modified),
        ),
    )
  ) {
    throw new Error(
      "Invalid automatic exclusion report. Your files have not been changed.",
    );
  }
  return report;
}
function save(config: Configuration, report: ScopeReport) {
  const path = reportPath(config);
  writeFileSync(path + ".tmp", JSON.stringify(report));
  renameSync(path + ".tmp", path);
  const excluded = report.groups
    .filter((g) => !g.uncertain && !report.restored.includes(g.root))
    .flatMap((g) => g.files.map((f) => f.path));
  writeFileSync(manifestPath(config) + ".tmp", JSON.stringify(excluded));
  renameSync(manifestPath(config) + ".tmp", manifestPath(config));
}
export function restoreScope(
  config: Configuration,
  root: string,
  restore: boolean,
) {
  const report = readScope(config);
  if (!report.groups.some((g) => g.root === root))
    throw new Error("This exclusion is no longer in the report.");
  report.restored = report.restored.filter((p) => p !== root);
  if (restore) report.restored.push(root);
  save(config, report);
}
let cachedFilter:
  | { index: string; stamp: string; excluded: Map<string, Exclusion> }
  | undefined;
export function filterScope(
  config: Configuration,
  result: import("./backend.ts").SearchResult,
) {
  const info = statSync(reportPath(config), { throwIfNoEntry: false });
  const stamp = info ? `${info.ino}:${info.mtimeMs}:${info.size}` : "missing";
  if (cachedFilter?.index !== config.index || cachedFilter.stamp !== stamp) {
    const report = readScope(config);
    const excluded = new Map(
      report.groups
        .filter((g) => !g.uncertain && !report.restored.includes(g.root))
        .flatMap((g) => g.files.map((f) => [f.path, f] as const)),
    );
    cachedFilter = { index: config.index, stamp, excluded };
  }
  const excluded = cachedFilter.excluded;
  const keep = (hit: Hit) => {
    const entry = excluded.get(hit.path);
    if (!entry) return true;
    const current = statSync(hit.path, { throwIfNoEntry: false });
    return (
      current?.size !== entry.size ||
      Math.abs(current.mtimeMs / 1000 - entry.modified) >= 0.000001
    );
  };
  const strong = result.hits.slice(0, result.strong).filter(keep);
  return {
    ...result,
    hits: [...strong, ...result.hits.slice(result.strong).filter(keep)],
    strong: strong.length,
  };
}
