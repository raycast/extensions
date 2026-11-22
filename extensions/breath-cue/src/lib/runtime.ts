import { environment, LocalStorage } from "@raycast/api";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { presentBreathing, sampleContext } from "swift:../../swift/BreathCue";
import { applyOutcome, emptyState, tick, type Outcome, type Reason, type State, type TickResult } from "./engine";
import { patternFor } from "./patterns";

const STATE_KEY = "state-v1";

function paths() {
  if (!existsSync(environment.supportPath)) mkdirSync(environment.supportPath, { recursive: true });
  return {
    lock: join(environment.supportPath, "overlay.lock"),
    result: join(environment.supportPath, "overlay-result.json"),
  };
}

export async function loadState(): Promise<State> {
  const raw = await LocalStorage.getItem<string>(STATE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as State;
      if (parsed.v === 1) return { ...emptyState(Date.now()), ...parsed };
    } catch {
      // fall through to a fresh state
    }
  }
  return emptyState(Date.now());
}

export async function saveState(state: State): Promise<void> {
  await LocalStorage.setItem(STATE_KEY, JSON.stringify(state));
}

/** Folds the result of the last overlay (finished or skipped) into the adaptive state. */
function absorbOutcome(state: State): State {
  const { result } = paths();
  if (!existsSync(result)) return state;
  try {
    const outcome = JSON.parse(readFileSync(result, "utf8")) as Outcome;
    return applyOutcome(state, outcome);
  } catch {
    return state;
  } finally {
    rmSync(result, { force: true });
  }
}

export async function showOverlay(reason: Reason, state: State, focusMin = 0): Promise<boolean> {
  const { lock, result } = paths();
  const p = patternFor(reason, state, focusMin);
  return presentBreathing({ reason, ...p, resultPath: result, lockPath: lock });
}

/** One sampling step: read the context, update the state, show a cue if the moment is right. */
export async function runTick(options: { force?: boolean } = {}): Promise<TickResult> {
  const now = Date.now();
  let state = absorbOutcome(await loadState());
  const sample = await sampleContext(paths().lock);

  // The menu bar re-renders on clicks too; only advance the clock on real ticks.
  if (!options.force && state.lastTickAt && now - state.lastTickAt < 40_000) {
    const preview = tick(state, sample, now);
    return { state, cue: null, status: preview.status };
  }

  const focusMinBefore = state.focusStart ? Math.round((now - state.focusStart) / 60_000) : 0;
  const result = tick(state, sample, now);
  state = result.state;
  if (result.cue) {
    const shown = await showOverlay(result.cue, state, focusMinBefore);
    if (!shown) {
      state.cues.pop();
    }
  }
  await saveState(state);
  return { ...result, state };
}
