import { access, readFile, stat } from "fs/promises";
import { homedir } from "os";
import { basename, join } from "path";

const SUPPORT_DIR = join(homedir(), "Library", "Application Support", "Lancetta");

/**
 * A file in Lancetta's own folder. Only `usage.json` is a promised interface; the others the
 * extension reads (the history, the session wall, the token cache) are the app's internal
 * records, read defensively and only for what the app cannot export yet.
 */
export const supportFile = (name: string) => join(SUPPORT_DIR, name);

/**
 * The document Lancetta writes after every poll, and that `Lancetta usage --json` prints.
 * The extension reads the file and never an agent: a second reader asking for Claude's
 * keychain item would put up a second macOS dialog, and a second poller doubles every request.
 */
export const SNAPSHOT_PATH = supportFile("usage.json");

/** The one schema this extension knows. Lancetta changes it only when a field is removed, renamed or changes meaning. */
export const SUPPORTED_SCHEMA = 1;

/**
 * Lancetta polls every 45 seconds by default and every 5 minutes at most, so a document or a
 * reading older than a quarter of an hour means the app is not running (`StatusLine.stale`).
 */
export const STALE_SECONDS = 15 * 60;

/** The one URL the app answers: the window with the full picture. */
export const OVERVIEW_URL = "lancetta://overview";
export const DOWNLOAD_URL = "https://lancetta.app/download";

export type Window = {
  /** What has been USED, 0–100. `null` is unknown, never 0. */
  usedPercent: number | null;
  resetsAt: number | null;
  /** The plan has no such window (Claude's Ultra plan has no 5-hour one): nothing to wait for. */
  absent?: boolean;
};

export type Model = { id: string; label: string; group: string; usedPercent: number | null; resetsAt: number | null };

export type Reading = {
  observedAt: number;
  fiveHour: Window;
  sevenDay: Window;
  plan: string | null;
  /** Refused by the account. A comfortable percentage can sit beside it, so read this first. */
  blocked: boolean;
  blockedBucket: string | null;
  models: Model[];
  /** Codex's free resets; null for a source that has none. */
  resetCreditsAvailable: number | null;
};

/** A catalogue entry. A `state` is not a fault: it clears by itself or waits on a click. */
export type Problem = { code: string; title: string; message: string; detail: string | null; state: boolean };

export type Agent = { agent: string; route: string | null; reading: Reading | null; problem: Problem | null };

export type Advice = {
  /** `spent`, `stop`, `week`, `room`, `lapse`, `maintenance` or `orphans`: stable. */
  kind: string;
  /** `warning`, `caution`, `encourage` or `info`: stable, and the order the panel sorts by. */
  tone: string;
  agent: string | null;
  title: string;
  steps: string[];
  basis: string;
  at: number | null;
  first: boolean;
};

export type Snapshot = {
  schema: number;
  app: string;
  writtenAt: number;
  agents: Agent[];
  advice?: Advice[] | null;
};

export class LancettaUnavailable extends Error {
  constructor(
    readonly reason: "missing" | "unreadable" | "schema",
    message: string,
  ) {
    super(message);
  }
}

export async function loadSnapshot(): Promise<Snapshot> {
  let text: string;
  try {
    text = await readFile(SNAPSHOT_PATH, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new LancettaUnavailable(
        "missing",
        `Lancetta has never written ${SNAPSHOT_PATH}: it is not installed, or has not run yet. It is a macOS menu bar app: ${DOWNLOAD_URL}`,
      );
    }
    throw new LancettaUnavailable("unreadable", `Could not read ${SNAPSHOT_PATH}: ${(error as Error).message}`);
  }
  let snapshot: Snapshot;
  try {
    snapshot = JSON.parse(text) as Snapshot;
  } catch {
    // the app replaces the file in one atomic step, so this is not a half-written document
    throw new LancettaUnavailable("unreadable", `${SNAPSHOT_PATH} is not valid JSON.`);
  }
  if (snapshot.schema !== SUPPORTED_SCHEMA) {
    throw new LancettaUnavailable(
      "schema",
      `Lancetta ${snapshot.app} writes schema ${snapshot.schema}; this extension reads schema ${SUPPORTED_SCHEMA}. Update the extension.`,
    );
  }
  return snapshot;
}

/**
 * One of Lancetta's internal files, or null when the app has run but not written it yet (no
 * session seen, no Usage view opened). When `usage.json` is missing too the app has never run
 * here, and that is said rather than shown as an empty list.
 */
export async function readSupportFile(path: string): Promise<{ text: string; modified: number } | null> {
  try {
    const [text, info] = await Promise.all([readFile(path, "utf8"), stat(path)]);
    return { text, modified: info.mtimeMs };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  try {
    await access(SNAPSHOT_PATH);
  } catch {
    throw new LancettaUnavailable(
      "missing",
      `Lancetta has not run on this Mac. It is a macOS menu bar app: ${DOWNLOAD_URL}`,
    );
  }
  return null;
}

export const isMissing = (error?: Error) => error instanceof LancettaUnavailable && error.reason === "missing";

export const nowSeconds = () => Math.floor(Date.now() / 1000);

export const isStale = (epoch: number, now = nowSeconds()) => now - epoch > STALE_SECONDS;

/**
 * The advice still about now: one about the Mac, or about an agent whose reading is under a
 * quarter of an hour old. The document is rewritten after every poll, so it can be new while
 * the reading an agent's advice rests on is hours old (Lancetta's `currentAdvice`).
 */
export function currentAdvice(snapshot: Snapshot, now = nowSeconds()): Advice[] {
  return (snapshot.advice ?? []).filter((item) => {
    if (!item.agent) return true;
    const reading = snapshot.agents.find((a) => a.agent === item.agent)?.reading;
    return !!reading && !isStale(reading.observedAt, now);
  });
}

/**
 * The advice whose `at` is when this window runs out at the current pace. `week` is always about
 * the week; `stop` names its window only in the words of its basis ("5 hours: …", "7 days: …"),
 * which Lancetta may reword, so this is the one place that reads them.
 * TODO: match on a `window` field once Lancetta's snapshot carries one.
 */
export function runOutAdvice(advice: Advice[], agent: string, window: "fiveHour" | "sevenDay"): Advice | undefined {
  const basis = window === "fiveHour" ? "5 hours" : "7 days";
  return advice.find(
    (a) =>
      a.agent === agent &&
      a.at !== null &&
      ((a.kind === "stop" && a.basis.startsWith(basis)) || (window === "sevenDay" && a.kind === "week")),
  );
}

/** `Fri 20, 13:59`: a moment inside a window, as the side panes show it. */
export const formatWhen = (epoch: number) =>
  new Date(epoch * 1000).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** `Fri 20 Nov, 13:59`: a moment that may be weeks back. In a side pane, through `NumberRow` (Raycast 2 cuts it in a label). */
export const formatDate = (epoch: number) =>
  new Date(epoch * 1000).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/** The last folder of a path, as a session or a process is named by it. */
export const folderName = (path?: string | null) => (path ? basename(path) : undefined);

/** `3h29m`, `51m`, `2d4h`: the shape Lancetta's own panel uses. */
export function formatSpan(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return h > 0 ? `${d}d${h}h` : `${d}d`;
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}m`;
  return `${m}m`;
}

/** Lancetta's colour bands, as its status line draws them: green under 50% used, yellow under 80%, red from there. */
export function band(usedPercent: number): "low" | "mid" | "high" {
  if (usedPercent < 50) return "low";
  if (usedPercent < 80) return "mid";
  return "high";
}

export const planName = (plan: string | null) => (plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : null);
