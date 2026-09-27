// What the extension knows about Hostbeam, in one place.
//
// The Mac app owns its config; this only ever reads it. Two things make that
// enough for most of what a launcher needs: the file lists the hosts and the
// last beams (with their thumbnails), and `hostbeam://beam` starts a beam
// without the extension having to know anything about SSH.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** The app's durable store — the same file Preferences writes. */
export const CONFIG_PATH = join(
  homedir(),
  "Library",
  "Application Support",
  "com.hostbeam.app",
  "config.json",
);

/** The app's bundle id, used instead of its name so a stray build elsewhere
 *  on disk cannot answer for it. */
export const BUNDLE_ID = "com.hostbeam.app";

export interface RecentBeam {
  id: string;
  hostId: string;
  hostName?: string;
  /** The remote path — what a copy hands you. */
  path: string;
  at: number;
  /** The preview the app shows: the path of a file in the app's cache since
   *  Hostbeam 0.1.27, a data URL in rows written before. Absent when it was
   *  trimmed to keep the app's cache in budget, or the format had no decoder. */
  thumb?: string | null;
  /** Rows sharing this arrived in one gesture. */
  group?: string;
}

export interface HostbeamConfig {
  addedIds?: string[];
  defaultId?: string | null;
  recent?: RecentBeam[];
  manualHosts?: { id: string; name?: string }[];
  settings?: {
    sentence?: string;
    copySentence?: boolean;
    /** Preferences → General → Beaming → "Let other apps control Hostbeam".
     *  On by default since Hostbeam 0.1.26, so a missing key means allowed;
     *  only a saved `false` refuses. This extension is one of the "other apps". */
    allowUrlBeam?: boolean;
  };
}

/** The config, or null when Hostbeam is not installed or has never run. */
export function readConfig(): HostbeamConfig | null {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as HostbeamConfig;
  } catch {
    return null;
  }
}

/** The paste-ready text for one or more remote paths, using the sentence the
 *  user configured — the same rule the app applies, so a copy from here and a
 *  copy from the app's own Recent list give you the same thing. */
export function sentenceFor(
  cfg: HostbeamConfig | null,
  paths: string[],
): string {
  const template = cfg?.settings?.sentence ?? "";
  const one = (path: string) =>
    template.includes("{path}") ? template.split("{path}").join(path) : path;
  return paths.map(one).join("\n");
}

/** Rows of one gesture, newest first — grouping *adjacent* rows that share a
 *  `group`, which is how the app itself groups them. */
export function groupRecent(rows: RecentBeam[]): RecentBeam[][] {
  const out: RecentBeam[][] = [];
  for (const row of rows) {
    const last = out[out.length - 1];
    if (last && row.group && last[0].group === row.group) last.push(row);
    else out.push([row]);
  }
  return out;
}

/** The installed app's version, or null if it cannot be found.
 *
 *  Read from the bundle rather than from the config: the config's
 *  `lastVersion` is the version whose release notes were last shown, which
 *  lags the installed one and would refuse commands that work. `/Applications`
 *  first because that is where both the dmg and the Homebrew cask put it;
 *  Spotlight answers for anywhere else.
 */
export function installedVersion(): string | null {
  const read = (app: string) => {
    const plist = join(app, "Contents", "Info.plist");
    const out = execFileSync(
      "plutil",
      ["-extract", "CFBundleShortVersionString", "raw", "-o", "-", plist],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    return out.trim() || null;
  };
  try {
    return read("/Applications/Hostbeam.app");
  } catch {
    /* installed somewhere else, or not at all */
  }
  try {
    const found = execFileSync(
      "mdfind",
      [`kMDItemCFBundleIdentifier == '${BUNDLE_ID}'`],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    )
      .split("\n")
      .find((line) => line.trim().endsWith(".app"));
    return found ? read(found.trim()) : null;
  } catch {
    return null;
  }
}

/** Whether `version` is at least `minimum`, comparing the numbers in each.
 *  An unreadable version answers yes: refusing to work because a check could
 *  not be made is worse than letting the app ignore a link it does not know. */
export function atLeast(version: string | null, minimum: string): boolean {
  if (!version) return true;
  const parts = (v: string) =>
    v.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const [have, want] = [parts(version), parts(minimum)];
  for (let i = 0; i < Math.max(have.length, want.length); i++) {
    const [a, b] = [have[i] ?? 0, want[i] ?? 0];
    if (a !== b) return a > b;
  }
  return true;
}

/** The last segment of a remote path; remote paths are posix. */
export function fileName(path: string): string {
  return path.split("/").pop() || path;
}
