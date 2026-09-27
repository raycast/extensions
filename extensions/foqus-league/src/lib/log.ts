import { execFile } from "child_process";
import { promisify } from "util";
import type { FocusEvent, LoggedBlocks, PendingStart, Session } from "./types.ts";

const exec = promisify(execFile);

export const PREDICATE =
  'subsystem == "com.raycast.macos" AND (category == "focus" OR eventMessage CONTAINS[c] "focus session")';

const START_HEADLINE = /Start(?:ing)? focus session/i;
const SUMMARY_HEADLINE = /Focus session\s*activity\s*summary/i;
const UPDATE_HEADLINE = /^Updating focus session/i;
const END_HEADLINE = /^(?:Complete|Cancel) focus session|^Tearing down focus session/i;
const PAUSE_HEADLINE = /^Pause focus session/i;
const BLOCKED_HEADLINE = /^Website has been blocked/i;

export const MAX_SESSION_MINUTES = 12 * 60;

export function resolveDuration(
  wallClockMs: number,
  reportedSeconds: number | null,
): { minutes: number; source: "reported" | "timestamps" } | null {
  const wallMinutes = Number.isFinite(wallClockMs) && wallClockMs > 0 ? wallClockMs / 60_000 : null;
  const reportedMinutes = reportedSeconds !== null && reportedSeconds > 0 ? Math.round(reportedSeconds) / 60 : null;

  if (reportedMinutes !== null && (wallMinutes === null || reportedMinutes <= wallMinutes + 1)) {
    const minutes = Math.floor(reportedMinutes);
    return minutes >= 1 && minutes <= MAX_SESSION_MINUTES ? { minutes, source: "reported" } : null;
  }
  if (wallMinutes !== null) {
    const minutes = Math.floor(wallMinutes);
    return minutes >= 1 && minutes <= MAX_SESSION_MINUTES ? { minutes, source: "timestamps" } : null;
  }
  return null;
}

function formatLogDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  );
}

export function parseLogTimestamp(raw: string): number | null {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d+))?\s*([+-]\d{2}):?(\d{2})$/.exec(raw.trim());
  if (!m) {
    const fallback = Date.parse(raw);
    return Number.isFinite(fallback) ? fallback : null;
  }
  const [, date, time, frac, offH, offM] = m;
  const ms = frac ? frac.slice(0, 3).padEnd(3, "0") : "000";
  const t = Date.parse(`${date}T${time}.${ms}${offH}:${offM}`);
  return Number.isFinite(t) ? t : null;
}

function field(message: string, ...labels: string[]): string | null {
  for (const label of labels) {
    const m = new RegExp(`^[\\s\\t]*${label}:[ \\t]*(.*)$`, "m").exec(message);
    if (!m) continue;
    const v = m[1]
      .trim()
      .replace(/,$/, "")
      .replace(/^"(.*)"$/, "$1")
      .trim();
    if (v.length) return v;
  }
  return null;
}

export function parseDurationSeconds(value: string | null): number | null {
  if (!value) return null;

  let seconds = 0;
  let matched = false;
  const units = /(\d+)\s*(hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\b/gi;
  for (const m of value.matchAll(units)) {
    matched = true;
    const n = Number.parseInt(m[1], 10);
    const unit = m[2].toLowerCase();
    if (unit.startsWith("h")) seconds += n * 3600;
    else if (unit.startsWith("m")) seconds += n * 60;
    else seconds += n;
  }
  if (matched) return seconds;

  const bare = Number.parseFloat(value);
  return Number.isFinite(bare) && /^\d+(?:\.\d+)?$/.test(value.trim()) ? bare : null;
}

function count(message: string, ...labels: string[]): number {
  const n = Number.parseInt(field(message, ...labels) ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function hostOf(url: string): string {
  const trimmed = url.trim();
  const withoutScheme = /^[a-z][a-z0-9+.-]*:\/\/(.*)$/i.exec(trimmed);
  const host = (withoutScheme ? withoutScheme[1] : trimmed).split(/[/?#]/)[0];
  return host.toLowerCase().replace(/^www\./, "");
}

function list(value: string | null): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function blockedFrom(message: string): LoggedBlocks | null {
  if (field(message, "Mode") === null) return null;
  const apps = list(field(message, "Blocked Apps"));
  const websites = list(field(message, "Blocked Websites"));
  if (!apps.length && !websites.length) return null;
  return { mode: field(message, "Mode") === "allow" ? "allow" : "block", apps, websites };
}

export function eventFromRecord(rec: { eventMessage?: string; timestamp?: string }): FocusEvent | null {
  const message = rec.eventMessage ?? "";
  const at = rec.timestamp ? parseLogTimestamp(rec.timestamp) : null;
  if (at === null) return null;

  if (START_HEADLINE.test(message)) {
    const blocked = blockedFrom(message);
    return {
      type: "start",
      at,
      goal: field(message, "Goal", "Title") ?? "",
      plannedSeconds: parseDurationSeconds(field(message, "Duration")),
      ...(blocked ? { blocked } : {}),
    };
  }

  if (UPDATE_HEADLINE.test(message)) {
    return {
      type: "update",
      at,
      goal: field(message, "Goal", "Title") ?? "",
      plannedSeconds: parseDurationSeconds(field(message, "Duration")),
    };
  }

  if (SUMMARY_HEADLINE.test(message)) {
    const startedRaw = field(message, "Start date");
    return {
      type: "summary",
      at,
      startedAt: startedRaw ? parseLogTimestamp(startedRaw) : null,
      reportedSeconds: parseDurationSeconds(field(message, "Duration", "duration")),
      pauses: count(message, "Pauses Count", "pauseEventCount"),
      blocks: count(message, "Block Events Count", "blockEventCount"),
    };
  }

  if (END_HEADLINE.test(message)) {
    return { type: "end", at, completed: /^Complete/i.test(message) || field(message, "Reason") === "completed" };
  }

  if (PAUSE_HEADLINE.test(message)) {
    return { type: "pause", at, seconds: parseDurationSeconds(field(message, "Duration")) };
  }

  if (BLOCKED_HEADLINE.test(message)) {
    const site = field(message, "Website");
    return site ? { type: "blocked", at, site: hostOf(site) } : null;
  }

  return null;
}

export type LogScan = {
  events: FocusEvent[];
  records: number;
};

export function isSessionRecord(message: string): boolean {
  const [headline, ...rest] = message.split("\n");
  return /focus/i.test(headline) && rest.some((line) => /^[ \t]+\S[^:]*:/.test(line));
}

export function parseEventLines(text: string): LogScan {
  const events: FocusEvent[] = [];
  let records = 0;
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    let rec: { eventMessage?: string; timestamp?: string };
    try {
      rec = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (isSessionRecord(rec.eventMessage ?? "")) records += 1;
    const event = eventFromRecord(rec);
    if (event) events.push(event);
  }
  return { events, records };
}

class FocusLogError extends Error {}

export async function readEvents(since: Date): Promise<LogScan> {
  let stdout: string;
  try {
    const result = await exec(
      "/usr/bin/log",
      ["show", "--predicate", PREDICATE, "--info", "--style", "ndjson", "--start", formatLogDate(since)],
      { maxBuffer: 64 * 1024 * 1024, timeout: 60_000 },
    );
    stdout = result.stdout;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new FocusLogError(`Could not read the log: ${message}`);
  }

  return parseEventLines(stdout);
}

export type PairedSession = Omit<Session, "source"> & { source: "timestamps" | "reported" };

function matchStart(startedAt: number, starts: Map<number, PendingStart>): PendingStart | undefined {
  const exact = starts.get(startedAt);
  if (exact) return exact;

  let best: PendingStart | undefined;
  let bestDelta = 2000;
  for (const candidate of starts.values()) {
    const delta = Math.abs(candidate.at - startedAt);
    if (delta <= bestDelta) {
      bestDelta = delta;
      best = candidate;
    }
  }
  return best;
}

function mostRecentStartBefore(at: number, starts: Map<number, PendingStart>): PendingStart | undefined {
  let latest: PendingStart | undefined;
  for (const candidate of starts.values()) {
    if (candidate.at <= at && (!latest || candidate.at > latest.at)) latest = candidate;
  }
  return latest;
}

function pendingStart(at: number, goal: string, planned: number | null | undefined): PendingStart {
  return { at, goal, ...(planned ? { planned } : {}) };
}

function plannedMinutes(seconds: number | null | undefined): number | undefined {
  if (seconds == null || seconds <= 0) return undefined;
  return Math.round(seconds / 60);
}

type Interlude = { at: number; seconds: number };

function pausedMsBetween(pauses: Interlude[], from: number, to: number): number {
  let total = 0;
  for (const p of pauses) if (p.at >= from && p.at <= to) total += p.seconds;
  return total * 1000;
}

function sitesBetween(blocked: { at: number; site: string }[], from: number, to: number): Record<string, number> {
  const sites: Record<string, number> = {};
  for (const b of blocked) if (b.at >= from && b.at <= to) sites[b.site] = (sites[b.site] ?? 0) + 1;
  return sites;
}

function tally(sites: Record<string, number>): number {
  return Object.values(sites).reduce((a, n) => a + n, 0);
}

export function pairSessions(
  events: FocusEvent[],
  pending: PendingStart[] = [],
): { sessions: PairedSession[]; pending: PendingStart[]; consumed: number[] } {
  const starts = new Map<number, PendingStart>();
  for (const p of pending) starts.set(p.at, p);

  const ordered = [...events].sort((a, b) => a.at - b.at);
  const pauses: Interlude[] = [];
  const blocked: { at: number; site: string }[] = [];

  for (const e of ordered) {
    if (e.type === "start") starts.set(e.at, pendingStart(e.at, e.goal, e.plannedSeconds));
    else if (e.type === "update") {
      const open = mostRecentStartBefore(e.at, starts);
      if (open) {
        starts.set(open.at, pendingStart(open.at, e.goal || open.goal, e.plannedSeconds ?? open.planned));
      }
    } else if (e.type === "pause" && e.seconds) pauses.push({ at: e.at, seconds: e.seconds });
    else if (e.type === "blocked") blocked.push({ at: e.at, site: e.site });
  }

  const sessions: PairedSession[] = [];
  const consumed: number[] = [];
  const closed = new Set<number>();

  function close(
    startAt: number,
    endAt: number,
    matched: PendingStart | undefined,
    reportedSeconds: number | null,
    extra: { pauses: number; blocks: number },
  ): void {
    if (matched) {
      starts.delete(matched.at);
      consumed.push(matched.at);
    }
    closed.add(startAt);

    const resolved = resolveDuration(endAt - startAt - pausedMsBetween(pauses, startAt, endAt), reportedSeconds);
    if (!resolved) return;

    const sites = sitesBetween(blocked, startAt, endAt);
    const planned = plannedMinutes(matched?.planned);
    const blocks = Math.max(extra.blocks, tally(sites));
    sessions.push({
      start: startAt,
      goal: matched?.goal ?? "",
      duration: resolved.minutes,
      source: resolved.source,
      ...(extra.pauses ? { pauses: extra.pauses } : {}),
      ...(blocks ? { blocks } : {}),
      ...(Object.keys(sites).length ? { sites } : {}),
      ...(planned !== undefined ? { planned } : {}),
    });
  }

  for (const e of ordered) {
    if (e.type === "summary") {
      let matched: PendingStart | undefined;
      let startAt: number;
      if (e.startedAt !== null) {
        matched = matchStart(e.startedAt, starts);
        startAt = e.startedAt;
      } else {
        matched = mostRecentStartBefore(e.at, starts);
        if (!matched) continue;
        startAt = matched.at;
      }
      if (closed.has(startAt)) continue;

      close(startAt, e.at, matched, e.reportedSeconds, { pauses: e.pauses, blocks: e.blocks });
      continue;
    }

    if (e.type === "end" && !e.completed) {
      const matched = mostRecentStartBefore(e.at, starts);
      if (!matched || closed.has(matched.at)) continue;
      starts.delete(matched.at);
      consumed.push(matched.at);
      closed.add(matched.at);
    }
  }

  return { sessions, pending: [...starts.values()].sort((a, b) => a.at - b.at), consumed };
}
