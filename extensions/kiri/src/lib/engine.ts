import { getPreferenceValues, launchCommand, LaunchType } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { flush, pollConnect, queueBlock } from "./account";
import { micInUse } from "./mic";
import { addHistory, type HistoryEntry, newId } from "./queue";
import { playEndSound, playSound, stopSound } from "./sound";
import {
  getConnection,
  getHistory,
  getLastFinished,
  getCallPause,
  getTimer,
  setCallPause,
  setHistory,
  setLastFinished,
  setPendingBreak,
  setTimer,
} from "./storage";
import { formatMinutes, isDone, pauseTimer, remainingMs, resumeTimer, type RunningTimer, startTimer } from "./timer";

export interface Prefs {
  focusMinutes: string;
  breakMinutes: string;
  autoStartBreak: boolean;
  endSound: boolean;
  saveToKiri: boolean;
  pauseOnCall: boolean;
}

export function prefs(): Prefs {
  return getPreferenceValues<Prefs>();
}

export function defaultFocusMinutes(): number {
  const n = Number(prefs().focusMinutes);
  return Number.isFinite(n) && n > 0 ? n : 25;
}

export function breakMinutes(): number {
  const n = Number(prefs().breakMinutes);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

/** Ask the menu bar command to redraw now. False when it is not turned on. */
export async function refreshMenuBar(): Promise<boolean> {
  try {
    await launchCommand({ name: "kiri-timer", type: LaunchType.Background });
    return true;
  } catch {
    return false;
  }
}

function escapeAppleScript(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** A macOS notification, with the end sound when it is turned on. */
export async function notify(title: string, message: string, silent = false): Promise<void> {
  if (!silent && prefs().endSound) playEndSound();
  try {
    await runAppleScript(
      `display notification "${escapeAppleScript(message)}" with title "${escapeAppleScript(title)}"`,
    );
  } catch {
    // Notifications can be turned off for Raycast; the menu bar still shows the state.
  }
}

/** Start a focus block, replacing whatever runs. The sound starts when given. */
export async function startFocus(minutes: number, task: string, sound: string): Promise<RunningTimer> {
  await stopSound();
  const t = startTimer("focus", minutes, Date.now(), newId(), task, sound);
  await setTimer(t);
  await setPendingBreak(null);
  await noteCallAtStart(t);
  if (sound) {
    try {
      await playSound(sound, t.minutes * 60);
    } catch (err) {
      await refreshMenuBar();
      throw err;
    }
  }
  await refreshMenuBar();
  return t;
}

export async function startBreak(minutes: number): Promise<RunningTimer> {
  await stopSound();
  const t = startTimer("break", minutes, Date.now(), newId());
  await setTimer(t);
  await setPendingBreak(null);
  await refreshMenuBar();
  return t;
}

/** Stop what runs. A focus block stopped early is not saved. */
export async function stopTimer(): Promise<RunningTimer | null> {
  const t = await getTimer();
  await stopSound();
  await setTimer(null);
  await setPendingBreak(null);
  await setCallPause(null);
  await refreshMenuBar();
  return t;
}

export async function pause(): Promise<void> {
  const t = await getTimer();
  if (!t || t.pausedAt !== null) return;
  await setTimer(pauseTimer(t, Date.now()));
  await stopSound();
  await refreshMenuBar();
}

export async function resume(): Promise<void> {
  const t = await getTimer();
  if (!t || t.pausedAt === null) return;
  const next = resumeTimer(t, Date.now());
  await setTimer(next);
  await noteCallAtStart(next);
  if (next.phase === "focus" && next.sound) {
    try {
      await playSound(next.sound, remainingMs(next, Date.now()) / 1000);
    } catch {
      // Keep the timer running without the sound.
    }
  }
  await refreshMenuBar();
}

/**
 * Notice a block or break that has ended: record it, save it to Kiri, offer or start the break,
 * and notify. Every command calls this, the menu bar every 10 seconds. Safe to call often.
 */
export async function tick(): Promise<void> {
  const now = Date.now();
  const t = await getTimer();
  if (t && !isDone(t, now)) await pauseForCall(t, now);
  if (t && isDone(t, now)) {
    // Two commands can tick at once: only one handles a given timer.
    if ((await getLastFinished()) !== t.id) {
      await setLastFinished(t.id);
      await setTimer(null);
      await stopSound();
      if (t.phase === "focus") await finishFocus(t);
      else await notify("Break over", "Start the next block when you are ready.");
    } else {
      await setTimer(null);
    }
  }
  // Blocks that could not be saved earlier (offline), and a connection started in Focus History.
  await flush(true);
  await pollConnect();
}

async function finishFocus(t: RunningTimer): Promise<void> {
  const p = prefs();
  const connected = (await getConnection()) !== null;
  const entry: HistoryEntry = {
    id: t.id,
    task: t.task,
    minutes: t.minutes,
    startedAt: t.startedAt,
    endedAt: t.endAt,
    sound: t.sound,
    kiri: connected && p.saveToKiri ? "queued" : "local",
  };
  await setHistory(addHistory(await getHistory(), entry));

  const minutes = breakMinutes();
  let next: string;
  if (p.autoStartBreak) {
    await startBreak(minutes);
    next = `Your ${formatMinutes(minutes)} break has started.`;
  } else {
    await setPendingBreak({ minutes, since: Date.now() });
    next = `Take a ${formatMinutes(minutes)} break when you are ready.`;
  }
  const done = t.task ? `${formatMinutes(t.minutes)} on “${t.task}”.` : `${formatMinutes(t.minutes)} done.`;
  await notify("Focus block done", `${done} ${next}`);

  if (entry.kiri === "queued") await queueBlock(entry);
}

/**
 * A block started or resumed while a microphone is already in use (the person chose to focus
 * during a call) is not paused for that call; Kiri waits until the microphone is free.
 */
async function noteCallAtStart(t: RunningTimer): Promise<void> {
  if (!prefs().pauseOnCall || t.phase !== "focus") {
    await setCallPause(null);
    return;
  }
  await setCallPause((await micInUse()) ? { timerId: t.id, mode: "ignore" } : null);
}

/** With "Pause on calls" on, pause a running focus block when an app starts using the microphone. */
async function pauseForCall(t: RunningTimer, now: number): Promise<void> {
  if (!prefs().pauseOnCall || t.phase !== "focus") return;
  const state = await getCallPause();
  if (state && state.timerId !== t.id) await setCallPause(null);
  if (t.pausedAt !== null) return;
  const busy = await micInUse();
  if (busy === null) return;
  if (state?.timerId === t.id && state.mode === "ignore") {
    if (!busy) await setCallPause(null);
    return;
  }
  if (!busy) return;
  await setTimer(pauseTimer(t, now));
  await stopSound();
  await setCallPause({ timerId: t.id, mode: "paused" });
  // No end sound: it would be heard on the call.
  await notify("Paused for your call", "Your block waits. Resume it from the menu bar after the call.", true);
}

/** True when the running block was paused by Kiri for a call. */
export async function pausedForCall(t: RunningTimer | null): Promise<boolean> {
  if (!t || t.pausedAt === null) return false;
  const state = await getCallPause();
  return state?.timerId === t.id && state.mode === "paused";
}
