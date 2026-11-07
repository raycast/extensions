import { environment, LaunchType, LocalStorage, launchCommand, showHUD } from "@raycast/api";
import * as engine from "./engine";
import { HistoryEntry, Phase, PHASE_NAMES, PresetSnapshot, TimerState } from "./engine";
import { formatClock } from "./format";
import { alarmFired, cancelAlarm, nativeAlertsEnabled, notifyNow, scheduleAlarm } from "./notify";
import { FALLBACK_SNAPSHOT, getDefaultPreset, loadPresets, toSnapshot } from "./presets";
import { getPrefs, Prefs } from "./prefs";

const STATE_KEY = "pomodoro.state.v1";
const HISTORY_KEY = "pomodoro.history.v1";
const VERIFY_KEY = "pomodoro.verify.v1";
const MAX_HISTORY = 5000;

/** Engine settings for a timer: lengths from its preset, automation from preferences. */
export function engineConfig(prefs: Prefs, preset: PresetSnapshot = FALLBACK_SNAPSHOT): engine.EngineConfig {
  return {
    focusMs: preset.focusMs,
    shortBreakMs: preset.shortBreakMs,
    longBreakMs: preset.longBreakMs,
    longBreakEvery: preset.longBreakEvery,
    autoStartBreaks: prefs.autoStartBreaks,
    autoStartFocus: prefs.autoStartFocus,
  };
}

export function configFor(state: TimerState, prefs: Prefs = getPrefs()): engine.EngineConfig {
  return engineConfig(prefs, state.preset);
}

// ---------- storage ----------

export async function loadState(): Promise<TimerState> {
  const raw = await LocalStorage.getItem<string>(STATE_KEY);
  if (!raw) return engine.initialState();
  try {
    return { ...engine.initialState(), ...(JSON.parse(raw) as TimerState) };
  } catch {
    return engine.initialState();
  }
}

async function saveState(state: TimerState): Promise<void> {
  await LocalStorage.setItem(STATE_KEY, JSON.stringify(state));
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveHistory(history: HistoryEntry[]): Promise<void> {
  const trimmed = history.length > MAX_HISTORY ? history.slice(history.length - MAX_HISTORY) : history;
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

async function appendHistory(entries: HistoryEntry[]): Promise<void> {
  if (entries.length === 0) return;
  const history = await loadHistory();
  history.push(...entries);
  await saveHistory(history);
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  const history = await loadHistory();
  await saveHistory(history.filter((entry) => entry.id !== id));
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_KEY);
}

// ---------- alarms ----------

function alarmText(state: TimerState, cfg: engine.EngineConfig): { title: string; body: string } {
  const next = engine.upcomingPhase(state, cfg);
  const nextAuto = next === "focus" ? cfg.autoStartFocus : cfg.autoStartBreaks;
  const task = state.label ? ` — ${state.label}` : "";
  if (state.phase === "focus") {
    return {
      title: `🍅 Focus complete${task}`,
      body: nextAuto
        ? `${PHASE_NAMES[next]} started. Step away from the screen.`
        : `Time for a ${PHASE_NAMES[next].toLowerCase()}.`,
    };
  }
  return {
    title: `☕ ${PHASE_NAMES[state.phase]} is over`,
    body: nextAuto ? "Next focus interval started." : "Ready for the next focus interval?",
  };
}

/**
 * Deeplink that wakes this extension in the background when an alarm fires, so the interval is
 * finalized and a Raycast HUD is shown right away (Raycast itself isn't running code at that moment).
 */
function wakeDeeplink(): string {
  const context = encodeURIComponent(JSON.stringify({ source: "alarm" }));
  return (
    `raycast://extensions/${encodeURIComponent(environment.ownerOrAuthorName)}/` +
    `${encodeURIComponent(environment.extensionName)}/quick-toggle?launchType=background&context=${context}`
  );
}

/** Makes sure exactly one Windows alarm task is waiting for the running interval's end. */
async function syncAlarm(state: TimerState, prefs: Prefs): Promise<TimerState> {
  const end = engine.endsAt(state);
  if (end === undefined) {
    if (state.alarm && state.alarm.firesAt > Date.now()) await cancelAlarm();
    return { ...state, alarm: undefined };
  }
  if (state.alarm && Math.abs(state.alarm.firesAt - end) < 1000) return state;
  const ok = await scheduleAlarm(end, alarmText(state, configFor(state, prefs)), prefs, wakeDeeplink());
  return { ...state, alarm: ok ? { firesAt: end } : undefined };
}

// ---------- is the timer window open? ----------

/**
 * A Raycast HUD always closes the Raycast window. So when the Pomodoro window is open, background
 * runs skip the HUD and let the window show an in-window toast instead. The window proves it's open
 * by writing a heartbeat every couple of seconds.
 */
const VIEW_OPEN_KEY = "pomodoro.viewOpen.v1";
const VIEW_OPEN_FRESH_MS = 5_000;

export async function markViewOpen(): Promise<void> {
  await LocalStorage.setItem(VIEW_OPEN_KEY, String(Date.now()));
}

export async function clearViewOpen(): Promise<void> {
  await LocalStorage.removeItem(VIEW_OPEN_KEY);
}

async function isViewOpen(): Promise<boolean> {
  const at = Number(await LocalStorage.getItem<string>(VIEW_OPEN_KEY));
  return Number.isFinite(at) && Date.now() - at < VIEW_OPEN_FRESH_MS;
}

// ---------- missed-alarm safety net ----------

/** How long to give the scheduled task to run before assuming it didn't. */
const VERIFY_GRACE_MS = 20_000;

interface PendingVerify {
  firesAt: number;
  message: string;
}

/** If a scheduled alarm should have run by now but didn't, notify another way. */
async function verifyPendingAlarm(prefs: Prefs): Promise<void> {
  const raw = await LocalStorage.getItem<string>(VERIFY_KEY);
  if (!raw) return;
  const pending = JSON.parse(raw) as PendingVerify;
  if (Date.now() - pending.firesAt < VERIFY_GRACE_MS) return;
  await LocalStorage.removeItem(VERIFY_KEY);
  if (alarmFired(pending.firesAt)) return;
  // Missed by more than 10 minutes (PC asleep, etc.): not worth an alert now.
  if (Date.now() - pending.firesAt > 10 * 60_000) return;
  await notifyNow({ title: pending.message, body: "" }, prefs);
}

// ---------- operations ----------

export interface Result {
  state: TimerState;
  completions: engine.Completion[];
}

/**
 * Loads state, finalizes anything that has ended, keeps the alarm in sync and saves.
 * Safe to call from any command, as often as needed.
 *
 * `announce`: show a Raycast HUD for intervals that just ended. Background runs set this; the open
 * timer view shows its own toast instead (a HUD would close the window).
 */
export async function reconcile(opts: { announce?: boolean } = {}): Promise<Result> {
  const prefs = getPrefs();
  const before = await loadState();
  const { state: advanced, completions } = engine.advance(before, configFor(before, prefs), Date.now());

  if (completions.length > 0) {
    const message = completionMessage(completions[completions.length - 1]);
    const firstEnd = completions[0].entry.endedAt;
    const recent = Date.now() - firstEnd < 10 * 60_000;
    if (before.alarm && Math.abs(before.alarm.firesAt - firstEnd) < 1000 && nativeAlertsEnabled(prefs)) {
      // A Windows alarm was scheduled for this; check later that it really ran.
      await LocalStorage.setItem(VERIFY_KEY, JSON.stringify({ firesAt: before.alarm.firesAt, message }));
    } else if (recent) {
      // No alarm was scheduled (alerts off, scheduling failed): send the Windows notification now.
      await notifyNow({ title: message, body: "" }, prefs);
    }
    // The Raycast HUD shows regardless of Windows notification settings — unless the timer window is
    // open, where a HUD would close it; the window shows its own toast then.
    if (opts.announce && recent && !(await isViewOpen())) await showHUD(message);
  }
  await verifyPendingAlarm(prefs);

  const synced = await syncAlarm(advanced, prefs);
  await appendHistory(completions.map((c) => c.entry));
  if (completions.length > 0 || JSON.stringify(synced) !== JSON.stringify(before)) await saveState(synced);
  return { state: synced, completions };
}

export function completionMessage(c: engine.Completion): string {
  const done = c.entry.phase === "focus" ? "🍅 Focus complete" : `☕ ${PHASE_NAMES[c.entry.phase]} over`;
  return c.autoStarted ? `${done} — ${PHASE_NAMES[c.next]} started` : `${done} — next: ${PHASE_NAMES[c.next]}`;
}

async function mutate(fn: (state: TimerState, now: number, prefs: Prefs) => TimerState, logPartial = false) {
  const { state } = await reconcile();
  const prefs = getPrefs();
  const now = Date.now();
  if (logPartial) {
    const partial = engine.partialEntry(state, now);
    if (partial) await appendHistory([partial]);
  }
  const next = await syncAlarm(fn(state, now, prefs), prefs);
  await saveState(next);
  await refreshStatusCommand();
  return next;
}

/**
 * Start a focus interval. Uses the given preset, or your default preset. The task name is what you
 * typed, else the preset's own task name. Starting while another interval runs replaces it (the
 * time already focused is still logged).
 */
export async function startFocus(label?: string, presetId?: string) {
  const presets = await loadPresets();
  const preset = (presetId && presets.find((p) => p.id === presetId)) || (await getDefaultPreset());
  const snapshot = toSnapshot(preset);
  // "" (not undefined) clears the previous task instead of carrying it over.
  const task = label?.trim() || preset.taskName || "";
  return mutate((s, now, prefs) => {
    // Switching presets starts a fresh cycle toward the long break.
    const cycleCount = s.preset?.id === snapshot.id ? s.cycleCount : 0;
    const withPreset = { ...s, preset: snapshot, cycleCount };
    return engine.start(withPreset, "focus", engineConfig(prefs, snapshot), now, task);
  }, true);
}

/** Start a break (or focus) with the current preset's lengths. */
export const startPhase = (phase: Phase) =>
  mutate((s, now, prefs) => engine.start(s, phase, configFor(s, prefs), now), true);
export const startNext = () =>
  mutate((s, now, prefs) => {
    const cfg = configFor(s, prefs);
    return engine.start(s, engine.upcomingPhase(s, cfg), cfg, now);
  });
export const startBreak = () =>
  mutate((s, now, prefs) => {
    const cfg = configFor(s, prefs);
    const phase =
      s.status === "finished" && s.phase === "focus"
        ? engine.upcomingPhase(s, cfg)
        : engine.breakAfter(s.cycleCount, cfg);
    return engine.start(s, phase, cfg, now);
  }, true);
export const pauseTimer = () => mutate((s, now) => engine.pause(s, now));
export const resumeTimer = () => mutate((s, now) => engine.resume(s, now));
export const restartTimer = () => mutate((s, now) => engine.restart(s, now));
/** Stop and keep the time already focused in your stats. */
export const stopTimer = () => mutate((s) => engine.stop(s), true);
/** Stop and throw this session away, as if it never started. */
export const discardTimer = () => mutate((s) => ({ ...engine.stop(s), label: undefined }), false);
export const skipInterval = () => mutate((s, now, prefs) => engine.skip(s, configFor(s, prefs), now), true);
export const resetCycle = () => mutate((s) => engine.resetCycle(s));
export const setLabel = (label: string) => mutate((s) => ({ ...s, label: label.trim() || undefined }));

// ---------- status ----------

export function statusLine(state: TimerState, now: number, todayCount: number, goal: number): string {
  const cfg = configFor(state);
  const cycle = `${Math.min(state.cycleCount, cfg.longBreakEvery)}/${cfg.longBreakEvery}`;
  const task = state.label ? ` · ${state.label}` : "";
  switch (state.status) {
    case "running": {
      const mins = Math.ceil(engine.remainingMs(state, now) / 60_000);
      const icon = state.phase === "focus" ? (state.preset?.icon ?? "🍅") : "☕";
      return `${icon} ${PHASE_NAMES[state.phase]} · ${mins} min left · ${cycle}${task}`;
    }
    case "paused":
      return `⏸ Paused · ${PHASE_NAMES[state.phase]} · ${formatClock(engine.remainingMs(state, now))} left${task}`;
    case "finished":
      return `✅ ${PHASE_NAMES[state.phase]} done · next: ${PHASE_NAMES[engine.upcomingPhase(state, cfg)]}`;
    default:
      return `Idle · ${todayCount}/${goal} 🍅 today`;
  }
}

/** Ask Raycast to re-run the status command so its root-search subtitle updates immediately. */
export async function refreshStatusCommand(): Promise<void> {
  try {
    await launchCommand({ name: "quick-toggle", type: LaunchType.Background });
  } catch {
    // Background refresh not enabled yet; the subtitle will update on the next run.
  }
}
