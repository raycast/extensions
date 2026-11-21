import { environment, LaunchType, showHUD, updateCommandMetadata } from "@raycast/api";
import { endsAt, PHASE_NAMES, remainingMs, TimerState, upcomingPhase } from "./lib/engine";
import { formatClock, formatTime } from "./lib/format";
import { getPrefs } from "./lib/prefs";
import { computeStats } from "./lib/stats";
import {
  configFor,
  loadHistory,
  pauseTimer,
  reconcile,
  resumeTimer,
  startFocus,
  startNext,
  statusLine,
} from "./lib/timer";

/**
 * One command, three ways it runs:
 * - You run it (or its hotkey): it does the obvious next thing —
 *   start focus with your default preset, pause, resume, or start the next interval.
 * - Raycast runs it in the background on an interval: keeps the timer moving and shows the live
 *   status as this command's subtitle in root search.
 * - The Windows alarm opens a deeplink to it the moment an interval ends, so the Raycast HUD for
 *   that ending shows right away.
 */
export default async function Command() {
  const background = environment.launchType === LaunchType.Background;
  let { state } = await reconcile({ announce: background });

  if (!background) {
    const { next, message } = await toggle(state);
    state = next;
    await showHUD(message);
  }

  const prefs = getPrefs();
  const stats = computeStats(await loadHistory(), Date.now());
  await updateCommandMetadata({ subtitle: statusLine(state, Date.now(), stats.todayCount, prefs.dailyGoal) });
}

async function toggle(state: TimerState): Promise<{ next: TimerState; message: string }> {
  const until = (s: TimerState) => {
    const end = endsAt(s);
    return end ? ` · until ${formatTime(end)}` : "";
  };

  switch (state.status) {
    case "running": {
      const next = await pauseTimer();
      return { next, message: `⏸ Paused · ${formatClock(remainingMs(next, Date.now()))} left` };
    }
    case "paused": {
      const next = await resumeTimer();
      return { next, message: `▶ Resumed ${PHASE_NAMES[next.phase]}${until(next)}` };
    }
    case "finished": {
      const phase = upcomingPhase(state, configFor(state));
      const next = await startNext();
      return { next, message: `${phase === "focus" ? "🍅" : "☕"} ${PHASE_NAMES[phase]} started${until(next)}` };
    }
    default: {
      const next = await startFocus();
      const what = next.label ?? next.preset?.name ?? "Focus";
      return { next, message: `${next.preset?.icon ?? "🍅"} ${what} started${until(next)}` };
    }
  }
}
