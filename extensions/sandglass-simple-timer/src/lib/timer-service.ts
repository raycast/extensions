/**
 * Glue between Raycast, the pure state transforms and the background alert.
 * Every command goes through these functions, so the state file and the alert process always agree.
 *
 * Version 1 manages a single timer: the current timer is always `state.timers[0]`.
 */
import { environment, getPreferenceValues } from "@raycast/api";
import { join } from "node:path";
import { isProcessAlive, scheduleAlert, type AlertContext } from "./alert.ts";
import {
  addTime,
  newTimer,
  pauseTimer,
  pushRecent,
  readState,
  restartTimer,
  resumeTimer,
  settle,
  writeState,
} from "./state.ts";
import type { SandglassState, Timer } from "./types.ts";

export const statePath = () => join(environment.supportPath, "state.json");

export const currentTimer = (state: SandglassState): Timer | undefined => state.timers[0];

/** Deeplink that opens Start Timer with a duration, used by the notification's "5 more minutes" button. */
export function startTimerLink(duration: string): string {
  const args = encodeURIComponent(JSON.stringify({ duration }));
  return `raycast://extensions/${environment.ownerOrAuthorName}/${environment.extensionName}/start-timer?arguments=${args}`;
}

function alertContext(): AlertContext {
  const { alertSound } = getPreferenceValues<Preferences>();
  return {
    statePath: statePath(),
    sound: alertSound ?? "chime",
    iconPath: join(environment.assetsPath, "icon.png"),
    darkIconPath: join(environment.assetsPath, "icon@dark.png"),
    snoozeLink: startTimerLink("5m"),
  };
}

/** Writes `timer` as the current timer (or removes it when undefined) and arms the alert if it is running. */
function saveCurrent(timer: Timer | undefined, recent?: number[]): SandglassState {
  const path = statePath();
  const previous = readState(path);
  const others = previous.timers.slice(1);
  let next: SandglassState = {
    ...previous,
    timers: timer ? [timer, ...others] : others,
    recent: recent ?? previous.recent,
  };
  // Write before launching the alert: the alert process validates its token against this file.
  writeState(path, next);
  if (timer?.status === "running") {
    const alertPid = scheduleAlert(timer, alertContext());
    if (alertPid) {
      next = { ...next, timers: [{ ...timer, alertPid }, ...others] };
      writeState(path, next);
    }
  }
  return next;
}

/**
 * Reads the state, marks finished timers and re-arms the alert if its process is gone (e.g. after Raycast
 * restarted). Call this whenever a command opens.
 */
export function loadState(): SandglassState {
  const path = statePath();
  const stored = readState(path);
  const settled = settle(stored, Date.now());
  const timer = currentTimer(settled);
  if (timer?.status === "running" && !isProcessAlive(timer.alertPid)) {
    return saveCurrent(timer);
  }
  if (settled !== stored) writeState(path, settled);
  return settled;
}

export function startTimer(durationMs: number, label?: string, rememberAsRecent = false): SandglassState {
  const state = loadState();
  const recent = rememberAsRecent ? pushRecent(state.recent, durationMs) : state.recent;
  return saveCurrent(newTimer(durationMs, Date.now(), label), recent);
}

export function pauseCurrent(): SandglassState {
  const timer = currentTimer(loadState());
  return timer ? saveCurrent(pauseTimer(timer, Date.now())) : loadState();
}

export function resumeCurrent(): SandglassState {
  const timer = currentTimer(loadState());
  return timer ? saveCurrent(resumeTimer(timer, Date.now())) : loadState();
}

export function addToCurrent(ms: number): SandglassState {
  const timer = currentTimer(loadState());
  return timer ? saveCurrent(addTime(timer, ms, Date.now())) : loadState();
}

export function restartCurrent(): SandglassState {
  const timer = currentTimer(loadState());
  return timer ? saveCurrent(restartTimer(timer, Date.now())) : loadState();
}

/** Removes the current timer. Its alert process notices on its next check and exits without notifying. */
export function stopCurrent(): SandglassState {
  loadState();
  return saveCurrent(undefined);
}
