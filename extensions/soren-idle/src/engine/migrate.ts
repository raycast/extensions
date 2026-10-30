import { ITEMS, SAVE_VERSION, TASK_BY_ID } from "./data";
import { advance, autoEquip, newGame } from "./engine";
import { HINTS } from "./hints";
import { GameState } from "./types";

/** Each step upgrades a save that is at version `key` to `key + 1`. */
const STEPS: Record<number, (s: GameState) => void> = {
  // v1 -> v2: the beacon used to mean "rescued"; an existing one now counts as contact made.
  // Hints arrived too, so skip the ones this save has clearly moved past.
  1: (s) => {
    if ((s.buildings.beacon ?? 0) > 0 && s.contactAt === null) s.contactAt = s.lastTick;
    s.hints = HINTS.filter((h) => h.id !== "low_hp" && h.when(s)).map((h) => h.id);
  },
  // v2 -> v3: gear used to count just by being owned. Now it has to be worn, so put it on.
  2: (s) => {
    for (const id of Object.keys(s.inventory) as (keyof typeof ITEMS)[])
      if (ITEMS[id] && (s.inventory[id] ?? 0) > 0) autoEquip(s, id);
  },
};

/** Brings a save written by an older build up to the current shape. */
export function migrateSave(saved: Partial<GameState>): GameState {
  const base = newGame(saved.lastTick ?? Date.now());
  const state: GameState = {
    ...base,
    ...saved,
    xp: { ...base.xp, ...saved.xp },
    stats: { ...base.stats, ...saved.stats, produced: { ...saved.stats?.produced } },
    settings: { ...base.settings, ...saved.settings },
    equipped: { ...saved.equipped },
  };
  delete (state.stats as Partial<typeof state.stats> & { deaths?: number }).deaths;
  for (let v = saved.version ?? 1; v < SAVE_VERSION; v++) STEPS[v]?.(state);
  state.version = SAVE_VERSION;
  return state;
}

export const exportSave = (s: GameState) => JSON.stringify(s);

const isPlain = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isNumber = (v: unknown) => typeof v === "number" && Number.isFinite(v);

/** Records whose every value must be a number. */
const NUMBER_RECORDS = ["xp", "inventory", "buildings", "passive", "keep", "mastery"] as const;

/** The first part of a save that has the wrong shape, if any. Compared against a fresh game. */
function shapeProblem(state: GameState): string | undefined {
  const fresh = newGame(0) as unknown as Record<string, unknown>;
  const saved = state as unknown as Record<string, unknown>;
  for (const [key, expected] of Object.entries(fresh)) {
    const value = saved[key];
    // A field that starts out null can hold a string, number or object later on.
    if (expected === null) continue;
    if (typeof value !== typeof expected || Array.isArray(value) !== Array.isArray(expected) || value === null)
      return key;
    if (typeof expected === "number" && !isNumber(value)) return key;
  }
  for (const key of NUMBER_RECORDS) {
    if (!Object.values(saved[key] as object).every(isNumber)) return key;
  }
  const stats = state.stats as unknown as Record<string, unknown>;
  for (const key of ["hunts", "produced"]) {
    if (!isPlain(stats[key]) || !Object.values(stats[key]).every(isNumber)) return `stats.${key}`;
  }
  if (!Object.values(state.buffs).every(isPlain)) return "buffs";
  if (!Object.values(state.nodes).every(isPlain)) return "nodes";
  if (!state.plots.every((p) => p === null || isPlain(p))) return "plots";
  return undefined;
}

/** Parses save text from the clipboard. Never throws; failures come back as an error message. */
export function importSave(text: string): { state?: GameState; error?: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text.trim());
  } catch {
    return { error: "The clipboard does not contain a save" };
  }
  const o = raw as Partial<GameState> | null;
  if (!isPlain(o) || !isPlain(o?.xp) || !isPlain(o?.inventory) || typeof o?.lastTick !== "number")
    return { error: "The clipboard does not contain a save" };
  if ((o.version ?? 1) > SAVE_VERSION) return { error: "This save is from a newer version of Soren Idle" };
  try {
    const state = migrateSave(o);
    if (state.activeTask && !TASK_BY_ID[state.activeTask]) state.activeTask = null;
    const problem = shapeProblem(state);
    if (problem) return { error: `The save is damaged (${problem})` };
    // Play a minute of it, so a save that would fail on every update is turned away now rather than
    // after it has replaced a working one.
    advance(state, state.lastTick + 60_000);
    return { state };
  } catch {
    return { error: "The save is damaged and cannot be played" };
  }
}
