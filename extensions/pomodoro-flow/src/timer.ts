import { LocalStorage, environment, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import type { Phase, TimerState } from "./types";
import { recordCompletion } from "./stats-store";

const STORAGE_KEY = "pomodoro-flow.timer.v1";

export function preferences() {
  return getPreferenceValues<Preferences>();
}

function safeMinutes(raw: string, fallback: number) {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.min(value, 240) : fallback;
}

export function durationFor(phase: Phase, prefs = preferences()) {
  const minutes =
    phase === "focus"
      ? safeMinutes(prefs.focusMinutes, 25)
      : phase === "short-break"
        ? safeMinutes(prefs.shortBreakMinutes, 5)
        : safeMinutes(prefs.longBreakMinutes, 15);
  return Math.round(minutes * 60_000);
}

export function initialState(phase: Phase = "focus"): TimerState {
  return {
    phase,
    status: "idle",
    remainingMs: durationFor(phase),
    focusSessions: 0,
    cycleSessions: 0,
  };
}

export async function loadState(): Promise<TimerState> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return initialState();
  try {
    const value = JSON.parse(raw) as TimerState;
    if (!value.phase || !value.status || !Number.isFinite(value.remainingMs))
      return initialState();
    return normalizeDailyCount(value);
  } catch {
    return initialState();
  }
}

function dayKey(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function normalizeDailyCount(state: TimerState): TimerState {
  if (
    !state.lastCompletedAt ||
    dayKey(state.lastCompletedAt) === dayKey(Date.now())
  )
    return state;
  return { ...state, focusSessions: 0 };
}

export async function saveState(state: TimerState) {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

export function remaining(state: TimerState, now = Date.now()) {
  return state.status === "running" && state.endsAt
    ? Math.max(0, state.endsAt - now)
    : Math.max(0, state.remainingMs);
}

export function start(state: TimerState): TimerState {
  const ms = remaining(state) || durationFor(state.phase);
  return {
    ...state,
    status: "running",
    remainingMs: ms,
    endsAt: Date.now() + ms,
  };
}

export function pause(state: TimerState): TimerState {
  return {
    ...state,
    status: "paused",
    remainingMs: remaining(state),
    endsAt: undefined,
  };
}

export function reset(state: TimerState): TimerState {
  return {
    ...state,
    status: "idle",
    remainingMs: durationFor(state.phase),
    endsAt: undefined,
  };
}

export function selectPhase(state: TimerState, phase: Phase): TimerState {
  return {
    ...state,
    phase,
    status: "idle",
    remainingMs: durationFor(phase),
    endsAt: undefined,
  };
}

export function adjust(state: TimerState, deltaMinutes: number): TimerState {
  const ms = Math.max(60_000, remaining(state) + deltaMinutes * 60_000);
  return {
    ...state,
    remainingMs: ms,
    endsAt: state.status === "running" ? Date.now() + ms : undefined,
  };
}

export function setDuration(state: TimerState, minutes: number): TimerState {
  const ms = Math.max(60_000, Math.min(240, minutes) * 60_000);
  return {
    ...state,
    remainingMs: ms,
    endsAt: state.status === "running" ? Date.now() + ms : undefined,
  };
}

function nextPhase(state: TimerState, prefs: Preferences): Phase {
  if (state.phase !== "focus") return "focus";
  const interval = Math.max(2, Number(prefs.longBreakEvery) || 4);
  return state.cycleSessions + 1 >= interval ? "long-break" : "short-break";
}

function label(phase: Phase) {
  return phase === "focus"
    ? "Focus"
    : phase === "short-break"
      ? "Short Break"
      : "Long Break";
}

export async function notifyCompletion(phase: Phase, sound: boolean) {
  const title = phase === "focus" ? "Focus complete" : "Break complete";
  const body =
    phase === "focus"
      ? "Beautiful work. Time to step away."
      : "Feeling refreshed? Your next focus is ready.";
  let customSoundStarted = false;
  if (sound) {
    const soundPath = path.join(
      environment.assetsPath,
      "pomodoro-flow-sound.wav",
    );
    if (existsSync(soundPath)) {
      try {
        const player = spawn("/usr/bin/afplay", [soundPath], {
          detached: true,
          stdio: "ignore",
        });
        player.once("error", () => void runAppleScript("beep 2"));
        player.once("exit", (code) => {
          if (code && code !== 0) void runAppleScript("beep 2");
        });
        player.unref();
        customSoundStarted = true;
      } catch {
        customSoundStarted = false;
      }
    }
  }

  const script = `${sound && !customSoundStarted ? "beep 2\n" : ""}display notification ${JSON.stringify(body)} with title ${JSON.stringify("Pomodoro Flow — " + title)}`;
  await runAppleScript(script).catch(() => undefined);
}

export async function completeIfNeeded(state: TimerState): Promise<TimerState> {
  if (state.status !== "running" || remaining(state) > 0) return state;
  const prefs = preferences();
  const completedPhase = state.phase;

  const completedFocus = completedPhase === "focus";
  const phase = nextPhase(state, prefs);
  const cycleSessions = completedFocus
    ? phase === "long-break"
      ? 0
      : state.cycleSessions + 1
    : state.cycleSessions;
  const shouldAutoStart = completedFocus
    ? prefs.autoStartBreaks
    : prefs.autoStartFocus;
  const completedAt = state.endsAt ?? Date.now();
  const base: TimerState = {
    phase,
    status: "idle",
    remainingMs: durationFor(phase, prefs),
    focusSessions:
      (dayKey(state.lastCompletedAt ?? completedAt) === dayKey(completedAt)
        ? state.focusSessions
        : 0) + (completedFocus ? 1 : 0),
    cycleSessions,
    endsAt: undefined,
    lastCompletedAt: completedAt,
  };
  const next = shouldAutoStart ? start(base) : base;
  await saveState(next);
  if (completedFocus) await recordCompletion(completedAt);
  await notifyCompletion(completedPhase, prefs.sound);
  return next;
}

export function formatTime(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function phaseLabel(phase: Phase) {
  return label(phase);
}

export function phaseIcon(phase: Phase) {
  return phase === "focus" ? "●" : phase === "short-break" ? "◐" : "○";
}
