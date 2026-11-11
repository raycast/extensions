import { PERK_BY_ID, perkCost, perkLevel, RATIONS_PER_PERK, RUN_MOD_BY_ID, starlightMult, TASKS } from "./data";
import { buildingLevel, levelOf, newGame } from "./engine";
import { GameState, SkillId } from "./types";

const SHARE_PER_KEEP_LEVEL = 0.1;
const FUND_CREDITS = 1000;

/** Starlight a launch right now would earn: one for every 15 skill levels, two per boss beaten, and five for getting out, plus a share for each run modifier in force. */
export function starlightGain(s: GameState): number {
  const levels = (Object.keys(s.xp) as SkillId[]).reduce((sum, skill) => sum + levelOf(s, skill), 0);
  const bosses = TASKS.filter((t) => t.boss && (s.stats.hunts[t.id] ?? 0) > 0).length;
  return Math.floor((Math.floor(levels / 15) + bosses * 2 + 5) * starlightMult(s));
}

export const canLaunch = (s: GameState) => buildingLevel(s, "rescue_ship") > 0;

const scaled = <T extends object>(record: T, k: number): T =>
  Object.fromEntries(Object.entries(record).map(([id, n]) => [id, n * k])) as T;

/** Leaves Soren: a hard reset that keeps Starlight, perks, the launch count, lifetime stats and settings. */
export function launch(s: GameState): { state: GameState; gain?: number; error?: string } {
  if (!canLaunch(s)) return { state: s, error: "Build the Rescue Ship first" };
  const gain = starlightGain(s);
  const keep = perkLevel(s, "keep") * SHARE_PER_KEEP_LEVEL;
  const state: GameState = {
    ...newGame(s.lastTick),
    createdAt: s.createdAt,
    rng: s.rng,
    credits: FUND_CREDITS * perkLevel(s, "fund"),
    inventory: perkLevel(s, "rations") ? { ration: RATIONS_PER_PERK * perkLevel(s, "rations") } : {},
    mods: [...s.nextMods],
    nextMods: [...s.nextMods],
    starlight: s.starlight + gain,
    perks: { ...s.perks },
    achievements: [...s.achievements],
    launches: s.launches + 1,
    settings: { ...s.settings },
    hints: [...s.hints],
    stats: structuredClone(s.stats),
    mastery: scaled(s.mastery, keep),
    masteryPool: scaled(s.masteryPool, keep),
  };
  return { state, gain };
}

export function buyPerk(s: GameState, id: string): { state: GameState; error?: string } {
  const perk = PERK_BY_ID[id];
  if (!perk) return { state: s, error: "Unknown perk" };
  if (perkLevel(s, id) >= perk.maxLevel) return { state: s, error: "Already at max level" };
  const cost = perkCost(s, perk);
  if (s.starlight < cost) return { state: s, error: `Needs ${cost} Starlight` };
  return { state: { ...s, starlight: s.starlight - cost, perks: { ...s.perks, [id]: perkLevel(s, id) + 1 } } };
}

/** Picks or drops a modifier for the next run. */
export function toggleMod(s: GameState, id: string): { state: GameState; error?: string } {
  if (!RUN_MOD_BY_ID[id]) return { state: s, error: "Unknown modifier" };
  const nextMods = s.nextMods.includes(id) ? s.nextMods.filter((m) => m !== id) : [...s.nextMods, id];
  return { state: { ...s, nextMods } };
}
