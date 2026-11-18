import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { environment, getPreferenceValues, launchCommand, LaunchType, LocalStorage } from "@raycast/api";
import { friendly } from "./displays";
import * as helper from "./helper";
import { HelperStatus, isStale } from "./helper";
import {
  acknowledged,
  BaselineLoss,
  baselineLost,
  boostsAnything,
  computeNext,
  Intent,
  NO_INTENT,
  Operation,
  parseExternalMax,
  parseIntent,
  parseLowBattery,
  parseStrategy,
  resolveOperation,
  Tuning,
} from "./intent";
import { levelFromPreference } from "./levels";
import { withFileLock } from "./lock";
import { log } from "./log";
import { notify } from "./notify";

const WANTED_KEY = "wanted";
const SETTLE_TIMEOUT_MS = 3000;
const SETTLE_POLL_MS = 100;
const lockPath = () => join(environment.supportPath, "intent.lock");

/** The saved intent, validated; undefined when never set or unreadable. */
export async function getWanted(): Promise<Intent | undefined> {
  const raw = await LocalStorage.getItem<string>(WANTED_KEY);
  if (!raw) return undefined;
  try {
    return parseIntent(JSON.parse(raw));
  } catch {
    return undefined; // a corrupt value must not block later launches
  }
}

export function tuning(): Tuning {
  const prefs = getPreferenceValues<Preferences>();
  return {
    strategy: parseStrategy(prefs.boostStrategy),
    externalMax: parseExternalMax(prefs.externalMax),
    lowBattery: parseLowBattery(prefs.pauseBelowBattery),
  };
}

export function defaultLevel(): number {
  return levelFromPreference(getPreferenceValues<Preferences>().defaultLevel).value;
}

async function poll(until: (s: HelperStatus) => boolean): Promise<HelperStatus> {
  const deadline = performance.now() + SETTLE_TIMEOUT_MS;
  let now = await helper.status();
  while (!until(now) && performance.now() < deadline) {
    await sleep(SETTLE_POLL_MS);
    now = await helper.status();
  }
  return now;
}

/**
 * Re-renders the menu bar item so its icon matches the new state now, not on the next interval tick.
 * Silent on failure, deliberately: `launchCommand` rejects whenever the menu bar command is disabled,
 * which is a normal setup for someone who only uses the hotkey commands or the AI tools. A failure
 * toast there would follow every successful change, and in an AI tool it could fail the tool's result.
 */
async function refreshMenuBar(): Promise<void> {
  try {
    await launchCommand({ name: "menu-bar", type: LaunchType.Background });
  } catch (error) {
    log("menu bar refresh skipped", { error: error instanceof Error ? error.message : String(error) });
  }
}

export interface Applied {
  after: HelperStatus;
  /** The operation changed nothing for connected displays ("Already at Max" / "Already Off"). */
  saturated: boolean;
  /** Whether replacing an older build's helper, with no saved levels, made this change start from no boost. */
  loss: BaselineLoss;
}

/** What to tell the user when replacing an outdated helper lost the previous levels; undefined when nothing was lost. */
export function continuityMessage(applied: Pick<Applied, "loss">): string | undefined {
  switch (applied.loss) {
    case "none":
      return undefined;
    case "restore":
      return "Boost turned off: the previous version's levels couldn't be carried over. Set a level to turn it back on.";
    case "toggle":
      return "The previous version's levels couldn't be read, so the boost was turned off to be safe. Toggle again to turn it on.";
    case "change":
      return "The previous version's levels couldn't be carried over, so this change started from no boost.";
  }
}

/**
 * The one way intent changes. Inside a cross-process lock, the complete next snapshot is sent to the helper,
 * and saved only when the helper reports back exactly that snapshot. The notification (and, when
 * asked, the menu bar refresh) runs after the lock is released.
 */
export async function applyOperation(op: Operation, options: { refreshMenuBar?: boolean } = {}): Promise<Applied> {
  const result = await withFileLock(lockPath(), async () => {
    const [live, savedBefore] = await Promise.all([helper.status(), getWanted()]);
    const wasStale = isStale(live);
    // Resolve toggles from `live`, never from the read-back after a stale stop, which always says "off".
    const resolved = resolveOperation(op, live, wasStale, savedBefore !== undefined);
    const loss = baselineLost(op, wasStale, savedBefore !== undefined);
    let current = live;
    if (wasStale) {
      // An older build may ignore the new messages and not apply this build's limits; quit is the one message every
      // build must keep understanding.
      log("stale helper: stopping", { pid: live.pid, protocol: live.protocol });
      await helper.stop();
      current = await poll((s) => !s.running);
      if (current.running) throw new Error("An older XDR Boost helper is still running and did not stop.");
    }
    const saved = savedBefore ?? NO_INTENT;
    const connected = current.displays.map((d) => d.uuid);
    const { intent, saturated } = computeNext(resolved, saved, connected);
    if (loss !== "none") log("stale helper replaced without saved levels: started from no boost", { op: resolved });
    log("apply", { op: resolved, saved, intent, running: current.running });
    const ceiling = tuning();
    if (current.running) await helper.setLevels(intent, ceiling);
    else if (boostsAnything(intent)) await helper.start(intent, ceiling);
    const after = await poll((s) => !isStale(s) && acknowledged(s, intent, ceiling));
    if (isStale(after) || !acknowledged(after, intent, ceiling)) {
      log("not acknowledged", { intent, after: { running: after.running, all: after.allLevel, levels: after.levels } });
      // Keep the saved intent equal to what a current helper reports, so the next change starts from what is
      // actually applied. Never sooner: a change that did not take must not be saved.
      if (after.running && !isStale(after))
        await LocalStorage.setItem(WANTED_KEY, JSON.stringify({ all: after.allLevel, levels: after.levels ?? {} }));
      throw new Error("The helper did not confirm the new levels within 3 seconds.");
    }
    // Saved only once the helper confirmed it. After a failure the old intent stays, and the next change
    // sends a complete snapshot that replaces whatever the helper holds.
    await LocalStorage.setItem(WANTED_KEY, JSON.stringify(intent));
    return { after, saturated, loss };
  });
  log("settled", { displays: result.after.displays.map((d) => [d.name, d.level, d.status]) });
  await Promise.all([
    notify(continuityMessage(result) ?? friendly(result.after, scopeOf(op))),
    options.refreshMenuBar ? refreshMenuBar() : undefined,
  ]);
  return result;
}

/** Which displays a notification should talk about. */
function scopeOf(op: Operation): "all" | string[] {
  if (op.kind === "displays") return Object.keys(op.levels);
  if (op.kind === "toggleDisplay") return [op.uuid];
  return "all";
}
