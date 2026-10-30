import { ITEMS } from "./data";
import { isGear, levelOf, maxHp, storageCap } from "./engine";
import { GameState, ItemId, SkillId } from "./types";

export interface Hint {
  id: string;
  text: string;
  /** True once the hint is relevant. Each hint is shown once, in table order. */
  when: (s: GameState) => boolean;
}

const anyLevel = (s: GameState, level: number) =>
  (Object.keys(s.xp) as SkillId[]).some((skill) => levelOf(s, skill) >= level);

export const HINTS: Hint[] = [
  {
    id: "welcome",
    text: "Start with Salvaging: open Salvaging below and start Scavenge Hull Scrap.",
    when: () => true,
  },
  {
    id: "first_cycle",
    text: "Tasks keep running while this window is closed. Come back to collect.",
    when: (s) => s.stats.cycles >= 1,
  },
  {
    id: "first_level",
    text: "Higher levels unlock new tasks. Locked ones show the level they need.",
    when: (s) => anyLevel(s, 2),
  },
  {
    id: "low_hp",
    text: "Low on health. Eat from Inventory, or cook more rations in Cooking.",
    when: (s) => s.hp < maxHp(s) * 0.5,
  },
  {
    id: "engineering",
    text: "Engineering 10 opens the Workshop in Base, and drones follow at level 19.",
    when: (s) => levelOf(s, "engineering") >= 7,
  },
  {
    id: "beacon",
    text: "Engineering 34 lets you build a Signal Beacon to call the locals.",
    when: (s) => levelOf(s, "engineering") >= 28,
  },
  {
    id: "equipment",
    text: "Gear only works while worn. Crafted pieces equip themselves, and Equipment lets you swap them.",
    when: (s) => (Object.values(s.equipped) as unknown[]).length > 0,
  },
  {
    id: "potions",
    text: "Potions give timed buffs. Open Inventory and choose Drink; they keep running while you are away.",
    when: (s) => Object.values(ITEMS).some((i) => i.potion && (s.inventory[i.id] ?? 0) > 0),
  },
  {
    id: "storage",
    text: "Some stacks are nearly full and the task feeding one will stop. Sell, use items, or build a Storage Depot.",
    when: (s) =>
      Object.entries(s.inventory).some(
        ([id, n]) => n >= storageCap(s) * 0.8 && !isGear(id as ItemId),
      ),
  },
  {
    id: "bounties",
    text: "The Bounty Board has requests. Accept one in Bounties, then hunt its target for Marks.",
    when: (s) => (s.buildings.bounty_board ?? 0) > 0 && !s.board.active,
  },
];

/** The next hint the player should see, if any. */
export function nextHint(s: GameState): Hint | undefined {
  return HINTS.find((h) => !s.hints.includes(h.id) && h.when(s));
}

export function dismissHint(s: GameState, id: string): GameState {
  return s.hints.includes(id) ? s : { ...s, hints: [...s.hints, id] };
}
