// Pure logic behind the Vitra extension: finding the snapshot, reading it, and
// formatting what it says. Kept free of any @raycast/api import so it can be
// tested on its own — the formatting is where the bugs live, not the JSX.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** Matches SCHEMA_VERSION in Vitra's electron/snapshot.ts. */
export const SUPPORTED_SCHEMA = 1;

/** Past this, Vitra probably is not running and the numbers are yesterday's. */
export const STALE_AFTER_MS = 45 * 60 * 1000;

export interface Snapshot {
  schema: number;
  generatedAt: string;
  appVersion: string;
  day: string | null;
  scoresWithheld: boolean;
  flags: { pacedHeart: boolean };
  scores: {
    readiness: number | null;
    sleep: number | null;
    activity: number | null;
  };
  measurements: {
    hrvMs: number | null;
    restingHr: number | null;
    sleepHours: number | null;
    steps: number | null;
    tempDeviationC: number | null;
    spo2: number | null;
  };
  baselines: {
    readiness: number | null;
    hrvMs: number | null;
    restingHr: number | null;
    sleepHours: number | null;
  };
}

/**
 * Where Vitra keeps its user data.
 *
 * Electron derives this from the app's productName, so the packaged app writes
 * to "Vitra". The lowercase variant is checked too because older installs used
 * the package name, and someone upgrading should not have to care which one
 * they have.
 */
export function candidatePaths(): string[] {
  const names = ["Vitra", "vitra"];
  if (process.platform === "win32") {
    const appData =
      process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
    return names.map((n) => path.join(appData, n, "snapshot.json"));
  }
  return names.map((n) =>
    path.join(
      os.homedir(),
      "Library",
      "Application Support",
      n,
      "snapshot.json",
    ),
  );
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function numberOrNull(v: unknown): boolean {
  return v === null || typeof v === "number";
}

const SCORE_KEYS = ["readiness", "sleep", "activity"] as const;
const MEASUREMENT_KEYS = [
  "hrvMs",
  "restingHr",
  "sleepHours",
  "steps",
  "tempDeviationC",
  "spo2",
] as const;
const BASELINE_KEYS = [
  "readiness",
  "hrvMs",
  "restingHr",
  "sleepHours",
] as const;

/**
 * The first thing wrong with a parsed snapshot, or null if it is one.
 *
 * Valid JSON at the right schema version is not the same as a snapshot. A
 * truncated write or a hand-edited file can parse cleanly and still be missing
 * every nested group the view reads, and trusting the schema number alone means
 * the crash lands in the middle of rendering, where the user sees a stack trace
 * instead of an explanation. Checking here keeps the failure where the other
 * failures already are.
 */
export function snapshotFault(v: unknown): string | null {
  if (!isObject(v)) return "the file does not contain a JSON object";
  // A file with no schema number at all is malformed rather than from a newer
  // Vitra, so it is a fault here and not an "unsupported version" answer.
  if (typeof v.schema !== "number") return "schema is missing or not a number";
  if (typeof v.generatedAt !== "string")
    return "generatedAt is missing or not a string";
  if (typeof v.appVersion !== "string")
    return "appVersion is missing or not a string";
  if (!(v.day === null || typeof v.day === "string"))
    return "day is neither a date nor null";
  if (typeof v.scoresWithheld !== "boolean")
    return "scoresWithheld is missing or not a boolean";
  // flags may be absent — the view already treats a missing pacedHeart as
  // false — but a flags that is present and not an object is a fault.
  if (v.flags !== undefined && !isObject(v.flags))
    return "flags is not an object";

  const groups = [
    ["scores", SCORE_KEYS],
    ["measurements", MEASUREMENT_KEYS],
    ["baselines", BASELINE_KEYS],
  ] as const;
  for (const [name, keys] of groups) {
    const section = v[name];
    if (!isObject(section)) return `${name} is missing or not an object`;
    for (const key of keys) {
      if (!numberOrNull(section[key]))
        return `${name}.${key} is neither a number nor null`;
    }
  }
  return null;
}

export type LoadResult =
  | { kind: "ok"; snapshot: Snapshot }
  | { kind: "missing" }
  | { kind: "unsupported"; found: number }
  | { kind: "unreadable"; message: string };

export function load(paths: string[] = candidatePaths()): LoadResult {
  let lastError = "";
  for (const p of paths) {
    let raw: string;
    try {
      raw = fs.readFileSync(p, "utf8");
    } catch (e) {
      // "Not here" and "here but I cannot read it" need different answers. The
      // first is the ordinary case — Vitra names its folder differently on this
      // machine, so try the next candidate. The second is a real fault the user
      // can act on, and telling them no snapshot exists would send them to open
      // an app that is already running and already writing the file.
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
        lastError = e instanceof Error ? e.message : String(e);
      }
      continue; // not this path — try the next
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      // A newer Vitra could publish a shape we do not understand. Say so rather
      // than rendering half of it and letting the user think a field is broken.
      if (
        isObject(parsed) &&
        typeof parsed.schema === "number" &&
        parsed.schema !== SUPPORTED_SCHEMA
      ) {
        return { kind: "unsupported", found: parsed.schema };
      }
      const fault = snapshotFault(parsed);
      if (fault) return { kind: "unreadable", message: fault };
      return { kind: "ok", snapshot: parsed as unknown as Snapshot };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  return lastError
    ? { kind: "unreadable", message: lastError }
    : { kind: "missing" };
}

/** U+2212. The durations and the deltas must not use different glyphs. */
const MINUS = "\u2212";

export function fmtHours(h: number | null): string {
  if (h == null) return "—";
  const total = Math.round(h * 60);
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, "0")}m`;
}

export function fmtNum(n: number | null, suffix = ""): string {
  return n == null ? "—" : `${n.toLocaleString()}${suffix}`;
}

/**
 * A signed number, formatted the same way as an unsigned one.
 *
 * Two things this gets right that the obvious version does not. It routes
 * through toLocaleString like fmtNum, so a decimal separator cannot differ
 * between two rows of the same list — "97,8%" beside "-0.27°C" is one view
 * speaking two languages. And it uses a real minus sign rather than a hyphen,
 * matching the durations, so "−2" and "−2m" are the same glyph.
 */
export function fmtSigned(n: number | null, suffix = ""): string {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : n < 0 ? MINUS : "";
  return `${sign}${Math.abs(n).toLocaleString()}${suffix}`;
}

export function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  // Floor, not round: half a minute rounds up to 1 and reports "1 min ago" for
  // something that happened thirty seconds back. Anything under a minute is
  // just now.
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * Difference against the person's own 30-day baseline.
 *
 * Rounded values in, difference out — never the other way round. Subtracting
 * raw numbers and rounding afterwards produces a delta that does not agree with
 * the two figures printed either side of it.
 */
export function deltaText(
  value: number | null,
  baseline: number | null,
  suffix = "",
): string | undefined {
  if (value == null || baseline == null) return undefined;
  const d = Math.round(value) - Math.round(baseline);
  if (d === 0) return "same as usual";
  return `${fmtSigned(d, suffix)} vs usual`;
}

/**
 * The same comparison for a duration, in the units the duration is displayed in.
 *
 * Sleep shows as "5h 31m", so its delta has to be minutes and hours too. A
 * decimal-hour delta beside an h/m value ("+0.1h" under "5h 31m") is the same
 * quantity written two ways, and the reader cannot check one against the other.
 */
export function deltaHoursText(
  value: number | null,
  baseline: number | null,
): string | undefined {
  if (value == null || baseline == null) return undefined;
  const mins = Math.round(value * 60) - Math.round(baseline * 60);
  if (mins === 0) return "same as usual";
  const sign = mins > 0 ? "+" : MINUS;
  const abs = Math.abs(mins);
  const body =
    abs < 60
      ? `${abs}m`
      : `${Math.floor(abs / 60)}h ${String(abs % 60).padStart(2, "0")}m`;
  return `${sign}${body} vs usual`;
}

export function emptyCopy(result: Exclude<LoadResult, { kind: "ok" }>): {
  title: string;
  description: string;
} {
  switch (result.kind) {
    case "missing":
      return {
        title: "No snapshot from Vitra yet",
        description:
          "This extension reads a file Vitra writes on your machine. Open Vitra and leave it running for a minute, then reload. If you do not have Vitra, it is a desktop app for your Oura ring — vitrahealth.app.",
      };
    case "unsupported":
      return {
        title: "Vitra is newer than this extension",
        description: `The snapshot is version ${result.found}, and this extension understands version ${SUPPORTED_SCHEMA}. Updating the extension should fix it.`,
      };
    case "unreadable":
      return {
        title: "Could not read Vitra's snapshot",
        description: `The file exists but could not be parsed: ${result.message}`,
      };
  }
}

export function summaryLine(s: Snapshot): string {
  const parts: string[] = [];
  if (!s.scoresWithheld && s.scores.readiness != null)
    parts.push(`Readiness ${s.scores.readiness}`);
  if (!s.scoresWithheld && s.scores.sleep != null)
    parts.push(`Sleep ${s.scores.sleep}`);
  if (s.measurements.sleepHours != null)
    parts.push(`${fmtHours(s.measurements.sleepHours)} asleep`);
  if (s.measurements.hrvMs != null)
    parts.push(`HRV ${s.measurements.hrvMs} ms`);
  return parts.length ? parts.join(" · ") : "No Vitra data yet";
}
