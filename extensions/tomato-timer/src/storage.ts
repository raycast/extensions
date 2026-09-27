import { environment } from "@raycast/api";
import fs from "fs";
import path from "path";

export type Kind = "focus" | "short" | "long";

export const KIND_TITLE: Record<Kind, string> = {
  focus: "Focus",
  short: "Short Break",
  long: "Long Break",
};

// The running session. Time is always derived from endAt (running) or
// remainingMs (paused), never from an in-memory counter, because Raycast
// unmounts the view when it closes. The floating timer reads this file and may
// write paused/remainingMs/endAt/overlay/stoppedAt; only the view writes history.
export interface Active {
  id: string;
  kind: Kind;
  label: string;
  durationMs: number;
  startedAt: number;
  endAt: number;
  paused: boolean;
  remainingMs: number;
  overlay: boolean;
  sound: boolean;
  stoppedAt?: number;
}

// Only focus sessions are recorded; breaks are not.
export interface Session {
  id: string;
  label: string;
  startedAt: number;
  endedAt: number;
  plannedMs: number;
  focusedMs: number;
  completed: boolean;
}

export function supportFile(name: string) {
  fs.mkdirSync(environment.supportPath, { recursive: true });
  return path.join(environment.supportPath, name);
}

function readJson<T>(name: string, fallback: T): T {
  try {
    let raw = fs.readFileSync(supportFile(name), "utf8");
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(name: string, value: unknown) {
  const target = supportFile(name);
  fs.writeFileSync(target + ".tmp", JSON.stringify(value), "utf8");
  fs.renameSync(target + ".tmp", target);
}

export const loadActive = () => readJson<Active | null>("active.json", null);

export function saveActive(a: Active | null) {
  if (a) writeJson("active.json", a);
  else fs.rmSync(supportFile("active.json"), { force: true });
}

export const loadHistory = () => readJson<Session[]>("history.json", []);
export const saveHistory = (h: Session[]) => writeJson("history.json", h);

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export function remainingOf(a: Active, now: number) {
  return a.paused || a.stoppedAt ? a.remainingMs : a.endAt - now;
}

export function record(a: Active, completed: boolean, endedAt: number, remainingMs: number, h: Session[]) {
  if (a.kind !== "focus" || h.some((s) => s.id === a.id)) return h;
  const focusedMs = completed ? a.durationMs : Math.max(0, a.durationMs - remainingMs);
  if (!completed && focusedMs < 60_000) return h;
  return [
    ...h,
    { id: a.id, label: a.label, startedAt: a.startedAt, endedAt, plannedMs: a.durationMs, focusedMs, completed },
  ];
}

// Closes a session that ended while the view was closed (finished, or stopped
// from the floating timer) and records it.
export function reconcile(a: Active | null, h: Session[], now: number) {
  if (!a) return { active: null, history: h, finished: undefined as Kind | undefined };
  if (a.stoppedAt)
    return { active: null, history: record(a, false, a.stoppedAt, a.remainingMs, h), finished: undefined };
  if (!a.paused && a.endAt <= now) return { active: null, history: record(a, true, a.endAt, 0, h), finished: a.kind };
  return { active: a, history: h, finished: undefined };
}
