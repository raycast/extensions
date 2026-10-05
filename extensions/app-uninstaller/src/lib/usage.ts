import { statSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { InstalledApp } from "./apps";
import { execCapture } from "./exec";

const HOME = homedir();

export type UsageSource = "spotlight" | "activity" | "unknown";

export interface Usage {
  /** Epoch milliseconds, or 0 when nothing is known. */
  lastUsed: number;
  source: UsageSource;
}

/**
 * Where an app writes when it runs, checked when Spotlight has nothing.
 *
 * Spotlight only records `kMDItemLastUsedDate` for a minority of applications —
 * about a quarter of those installed here. An app that has run recently has
 * almost always touched its preferences, saved state or container, so the newest
 * of those is a reasonable stand-in. It is reported as an estimate, not as a
 * launch date, because that is what it is.
 */
function activityPaths(bundleId: string): string[] {
  return [
    join(HOME, "Library/Preferences", `${bundleId}.plist`),
    join(HOME, "Library/Saved Application State", `${bundleId}.savedState`),
    join(HOME, "Library/Containers", bundleId),
    join(HOME, "Library/HTTPStorages", bundleId),
    join(HOME, "Library/Application Support", bundleId),
  ];
}

function newestActivity(bundleId: string): number {
  let newest = 0;
  for (const path of activityPaths(bundleId)) {
    try {
      newest = Math.max(newest, statSync(path).mtimeMs);
    } catch {
      // Not present; the app simply does not use that location.
    }
  }
  return newest;
}

/**
 * When each application was last used, keyed by bundle path.
 *
 * One `mdls` call covers every app: with a single `-name` it prints one line per
 * file, in the order the files were given.
 */
export async function lastUsed(apps: InstalledApp[]): Promise<Record<string, Usage>> {
  const usage: Record<string, Usage> = {};
  if (apps.length === 0) return usage;

  const stdout = await execCapture(
    "/usr/bin/mdls",
    ["-name", "kMDItemLastUsedDate", ...apps.map((app) => app.path)],
    20_000,
  );
  const lines = stdout.split("\n").filter((line) => line.includes("kMDItemLastUsedDate"));

  apps.forEach((app, index) => {
    const value = lines[index]?.split("=")[1]?.trim();

    if (value && value !== "(null)") {
      const parsed = Date.parse(value.replace(" +0000", "Z").replace(" ", "T"));
      if (Number.isFinite(parsed)) {
        usage[app.path] = { lastUsed: parsed, source: "spotlight" };
        return;
      }
    }

    const activity = newestActivity(app.bundleId);
    usage[app.path] = activity > 0 ? { lastUsed: activity, source: "activity" } : { lastUsed: 0, source: "unknown" };
  });

  return usage;
}
