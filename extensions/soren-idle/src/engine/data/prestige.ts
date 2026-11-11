import { GameState } from "../types";

export interface PerkDef {
  id: string;
  name: string;
  /** What one level gives. */
  description: string;
  maxLevel: number;
  /** Starlight the first level costs. Each level costs this much more than the one before. */
  cost: number;
}

/** What Starlight buys. Each perk is bought in levels and survives every launch. */
export const PERKS: PerkDef[] = [
  { id: "xp", name: "Veteran Instincts", description: "+3% XP in every skill.", maxLevel: 10, cost: 5 },
  { id: "speed", name: "Quick Hands", description: "Tasks take 2% less time.", maxLevel: 10, cost: 5 },
  {
    id: "keep",
    name: "Muscle Memory",
    description: "Keep 10% of every task's mastery and each skill's mastery pool after a launch.",
    maxLevel: 5,
    cost: 10,
  },
  { id: "fund", name: "Salvage Fund", description: "Start each run with 1,000 more Credits.", maxLevel: 10, cost: 2 },
  { id: "yield", name: "Bountiful Hands", description: "Hauls are 2% bigger.", maxLevel: 10, cost: 6 },
  { id: "rare", name: "Lucky Star", description: "Rare drops are 5% more likely.", maxLevel: 10, cost: 6 },
  { id: "hp", name: "Thick Skin", description: "+5 max HP.", maxLevel: 10, cost: 4 },
  { id: "rations", name: "Field Rations", description: "Start each run with 10 more Rations.", maxLevel: 5, cost: 3 },
];

/** A harsher run for more Starlight. Picked on the Voyage screen, in force from the next launch. */
export interface RunModDef {
  id: string;
  name: string;
  description: string;
  /** Share of the launch's Starlight this adds when the run it was in force on ends. */
  bonus: number;
}

export const RUN_MODS: RunModDef[] = [
  { id: "brutal", name: "Brutal Wilds", description: "Creatures are 25% stronger.", bonus: 0.25 },
  { id: "slow", name: "Slow Going", description: "Tasks take 25% longer.", bonus: 0.25 },
  { id: "thin", name: "Thin Pickings", description: "Rare drops are half as likely.", bonus: 0.2 },
];

export const RUN_MOD_BY_ID: Record<string, RunModDef> = Object.fromEntries(RUN_MODS.map((m) => [m.id, m]));

export const PERK_BY_ID: Record<string, PerkDef> = Object.fromEntries(PERKS.map((p) => [p.id, p]));

/** Each launch makes every creature this much stronger, and every haul this much bigger. */
export const RIFT_STEP = 0.1;
export const RIFT_YIELD = 0.05;

export const perkLevel = (s: GameState, id: string) => s.perks[id] ?? 0;

/** Starlight the next level of a perk costs. */
export const perkCost = (s: GameState, perk: PerkDef) => perk.cost * (perkLevel(s, perk.id) + 1);

export const HP_PER_PERK = 5;
export const RATIONS_PER_PERK = 10;

const hasMod = (s: GameState, id: string) => s.mods.includes(id);

/** What the modifiers in force on this run add to the Starlight a launch earns. */
export const starlightMult = (s: GameState) => 1 + s.mods.reduce((sum, id) => sum + (RUN_MOD_BY_ID[id]?.bonus ?? 0), 0);

export const yieldBonus = (s: GameState) => 0.02 * perkLevel(s, "yield");
export const rareBonus = (s: GameState) => (1 + 0.05 * perkLevel(s, "rare")) * (hasMod(s, "thin") ? 0.5 : 1);

export const xpBonus = (s: GameState) => 1 + 0.03 * perkLevel(s, "xp");
export const speedBonus = (s: GameState) => (1 - 0.02 * perkLevel(s, "speed")) * (hasMod(s, "slow") ? 1.25 : 1);

/** How much stronger the creatures are on this run. */
export const riftScale = (s: GameState) => 1 + RIFT_STEP * s.launches + (hasMod(s, "brutal") ? 0.25 : 0);
