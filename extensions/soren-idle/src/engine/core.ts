import {
  BUILDING_BY_ID,
  BUILDINGS,
  CONTACT_DELAY_MS,
  BOARD_REFRESH_MS,
  ITEMS,
  MAX_OFFLINE_MS,
  OFFLINE_BONUS_HOURS,
  speedBonus,
  perkLevel,
  rareBonus,
  HP_PER_PERK,
  STORAGE_CAPS,
  SAVE_VERSION,
  SKILLS,
} from "./data";
import { refillBoard } from "./bounty";
import { levelFromXp, xpForLevel } from "./levels";
import { masteryLevel, poolBonus, masterySpeed, hasMastery } from "./mastery";
import {
  BuffKind,
  EquipSlot,
  ItemDef,
  BuildingId,
  Bundle,
  FoodPriority,
  GameState,
  ItemId,
  Report,
  SkillId,
  TaskDef,
} from "./types";

export function newGame(now = Date.now()): GameState {
  return {
    version: SAVE_VERSION,
    createdAt: now,
    lastTick: now,
    activeTask: null,
    taskProgressMs: 0,
    taskRemaining: null,
    hp: maxHpFor(0),
    xp: Object.fromEntries(SKILLS.map((s) => [s.id, 0])) as Record<SkillId, number>,
    inventory: {},
    rng: (now ^ 0x9e3779b9) | 0,
    credits: 0,
    marks: 0,
    bountyXp: 0,
    board: { offers: [], active: null, refreshAt: 0, nextId: 1 },
    contactAt: null,
    equipped: {},
    unseen: null,
    buffs: {},
    buildings: {},
    passive: {},
    keep: {},
    settings: {
      eatBelow: 0,
      foodPriority: "weakest",
      compactNumbers: false,
      notifyStopped: true,
      notifyFinished: true,
      notifyBounty: true,
      notifyRare: true,
    },
    mastery: {},
    masteryPool: {},
    starlight: 0,
    perks: {},
    launches: 0,
    recentTasks: [],
    achievements: [],
    pets: [],
    mods: [],
    nextMods: [],
    nodes: {},
    plots: [],
    hints: [],
    stats: {
      cycles: 0,
      kills: 0,
      hunts: {},
      retreats: 0,
      produced: {},
      creditsEarned: 0,
      bounties: 0,
    },
  };
}

// --- levels -----------------------------------------------------------------

export { levelFromXp, xpForLevel };

export const levelOf = (s: GameState, skill: SkillId) => levelFromXp(s.xp[skill]);

/**
 * Combat strength as a tier. Levels run to 99 but the creatures were built for a 30-level climb,
 * so health and damage grow one step per three levels, starting at level 1.
 */
export const combatTier = (level: number) => Math.floor((level - 1) / 3) + 1;

export function maxHpFor(combatXp: number): number {
  return 30 + 5 * combatTier(levelFromXp(combatXp));
}

export const maxHp = (s: GameState) =>
  maxHpFor(s.xp.combat) + 10 * buildingLevel(s, "shelter") + HP_PER_PERK * perkLevel(s, "hp");

// --- inventory --------------------------------------------------------------

export const count = (s: GameState, id: ItemId) => s.inventory[id] ?? 0;

export function canAfford(s: GameState, cost: Bundle = {}): boolean {
  return (Object.entries(cost) as [ItemId, number][]).every(([id, n]) => count(s, id) >= n);
}

/** Equipment is carried one at a time, so it does not take up storage. */
export const isGear = (id: ItemId): boolean => !!ITEMS[id].slot;

/** How many of each item the survivor can hold. */
export const storageCap = (s: GameState) =>
  STORAGE_CAPS[Math.min(buildingLevel(s, "storage"), STORAGE_CAPS.length - 1)];

/** How many more of an item fit in storage. */
export const roomFor = (s: GameState, id: ItemId) =>
  isGear(id) ? Infinity : Math.max(0, storageCap(s) - count(s, id));

/** The first item in a bundle that would overflow storage, if any. */
export function overflowing(s: GameState, bundle: Bundle = {}): ItemId | undefined {
  return (Object.entries(bundle) as [ItemId, number][]).find(([id, n]) => roomFor(s, id) < n)?.[0];
}

/** Milliseconds of away time that count, raised by the Stasis Pod. */
export const offlineCapMs = (s: GameState) =>
  MAX_OFFLINE_MS + OFFLINE_BONUS_HOURS * 3_600_000 * buildingLevel(s, "stasis_pod");

/** Adds or removes items. Gains stop at the storage limit, and only what fits is reported. */
export function addItems(s: GameState, bundle: Bundle = {}, sign: 1 | -1 = 1, report?: Report) {
  for (const [id, n] of Object.entries(bundle) as [ItemId, number][]) {
    const delta = sign === 1 ? Math.min(n, roomFor(s, id)) : n;
    s.inventory[id] = Math.max(0, count(s, id) + sign * delta);
    if (sign === 1 && report && delta > 0) report.items[id] = (report.items[id] ?? 0) + delta;
  }
}

// --- base -------------------------------------------------------------------

export const buildingLevel = (s: GameState, id: BuildingId) => s.buildings[id] ?? 0;

/** Cost of the next level of a building. */
export function buildingCost(s: GameState, id: BuildingId): Bundle {
  const def = BUILDING_BY_ID[id];
  const level = buildingLevel(s, id);
  if (def.levelCosts) return def.levelCosts[Math.min(level, def.levelCosts.length - 1)];
  return Object.fromEntries(
    (Object.entries(def.baseCost) as [ItemId, number][]).map(([item, n]) => [
      item,
      Math.ceil(n * def.costGrowth ** level),
    ]),
  );
}

/** Credits the next level of a building costs. */
export function buildingCredits(s: GameState, id: BuildingId): number {
  const credits = BUILDING_BY_ID[id].levelCredits;
  return credits ? (credits[Math.min(buildingLevel(s, id), credits.length - 1)] ?? 0) : 0;
}

/** True once the locals have answered the beacon. */
export function firstContact(s: GameState): boolean {
  return s.contactAt !== null && s.lastTick >= s.contactAt;
}

/** Milliseconds until the locals arrive, or null if there is no pending signal. */
export function contactRemainingMs(s: GameState): number | null {
  return s.contactAt !== null && !firstContact(s) ? s.contactAt - s.lastTick : null;
}

export function powerCapacity(s: GameState): number {
  return BUILDINGS.reduce((sum, b) => sum + (b.powerProvided ?? 0) * buildingLevel(s, b.id), 0);
}

/** Share of full output the powered buildings get: 1 unless they draw more than the generators give. */
export function powerEfficiency(s: GameState): number {
  const used = powerUsed(s);
  return used > 0 ? Math.min(1, powerCapacity(s) / used) : 1;
}

export function powerUsed(s: GameState): number {
  return BUILDINGS.reduce((sum, b) => sum + (b.powerUse ?? 0) * buildingLevel(s, b.id), 0);
}

export function build(s: GameState, id: BuildingId): { state: GameState; error?: string } {
  const def = BUILDING_BY_ID[id];
  const level = buildingLevel(s, id);
  if (level >= def.maxLevel) return { state: s, error: "Already at max level" };
  if (def.requires && levelOf(s, def.requires.skill) < def.requires.level) {
    return { state: s, error: `Requires ${def.requires.skill} level ${def.requires.level}` };
  }
  if (def.requiresContact && !firstContact(s)) return { state: s, error: "There is nobody to talk to yet" };
  if (def.requiresBuilding && buildingLevel(s, def.requiresBuilding.id) < def.requiresBuilding.level) {
    const needed = BUILDING_BY_ID[def.requiresBuilding.id].name;
    return { state: s, error: `Requires ${needed} level ${def.requiresBuilding.level}` };
  }
  if (def.powerUse && powerCapacity(s) - powerUsed(s) < def.powerUse) {
    return { state: s, error: "Not enough power. Upgrade the Solar Generator" };
  }
  const cost = buildingCost(s, id);
  if (!canAfford(s, cost)) return { state: s, error: "Missing materials" };
  const credits = buildingCredits(s, id);
  if (s.credits < credits) return { state: s, error: "Not enough Credits" };
  const next = structuredClone(s);
  addItems(next, cost, -1);
  next.credits -= credits;
  next.buildings[id] = level + 1;
  if (id === "beacon") next.contactAt = s.lastTick + CONTACT_DELAY_MS;
  if (id === "bounty_board") {
    if (!next.board.refreshAt) next.board.refreshAt = s.lastTick + BOARD_REFRESH_MS;
    refillBoard(next);
  }
  return { state: next };
}

// --- derived stats ----------------------------------------------------------

// --- equipment --------------------------------------------------------------

/** What is worn right now. Anything no longer in the inventory is ignored. */
export const equippedItems = (s: GameState): ItemDef[] =>
  (Object.values(s.equipped) as ItemId[]).filter((id) => count(s, id) > 0).map((id) => ITEMS[id]);

export const isEquipped = (s: GameState, id: ItemId) => {
  const slot = ITEMS[id].slot;
  return !!slot && s.equipped[slot] === id;
};

/** Why an item cannot be worn, or undefined if it can. */
export function equipError(s: GameState, id: ItemId): string | undefined {
  const item = ITEMS[id];
  if (!item.slot) return "That cannot be equipped";
  if (count(s, id) < 1) return "You do not have that";
  if (item.combatReq && levelOf(s, "combat") < item.combatReq) return `Requires Combat level ${item.combatReq}`;
  return undefined;
}

export function equip(s: GameState, id: ItemId): { state: GameState; error?: string } {
  const error = equipError(s, id);
  if (error) return { state: s, error };
  const slot = ITEMS[id].slot as EquipSlot;
  return { state: { ...s, equipped: { ...s.equipped, [slot]: id } } };
}

export function unequip(s: GameState, slot: EquipSlot): GameState {
  const equipped = { ...s.equipped };
  delete equipped[slot];
  return { ...s, equipped };
}

/** Wears a new item if its slot is empty or it is a higher tier than what is worn. Changes `s`. */
export function autoEquip(s: GameState, id: ItemId) {
  const item = ITEMS[id];
  if (!item.slot || equipError(s, id)) return;
  const worn = s.equipped[item.slot];
  if (!worn || count(s, worn) < 1 || (item.tier ?? 0) > (ITEMS[worn].tier ?? 0)) s.equipped[item.slot] = id;
}

/** A potion buff that is still running at time `at`. */
export const activeBuff = (s: GameState, kind: BuffKind, at = s.lastTick) => {
  const buff = s.buffs[kind];
  return buff && at < buff.expiresAt ? buff : undefined;
};

/**
 * Everything that changes how fast, how strong or how lucky the survivor is, in one place:
 * the gear you carry and the potions you are under. `at` is the moment to evaluate buffs at.
 */
export function modifiers(s: GameState, at = s.lastTick) {
  const owned = equippedItems(s);
  // A weapon that is out of ammo does nothing: no damage, and no damage type for the triangle.
  const weapon = s.equipped.weapon && count(s, s.equipped.weapon) > 0 ? ITEMS[s.equipped.weapon] : undefined;
  const dry = weapon?.ammo !== undefined && count(s, weapon.ammo) < 1;
  const sky = (Object.values(ITEMS) as ItemDef[]).filter((i) => i.constellation && count(s, i.id) > 0);
  const toolSpeed = (skill: SkillId) =>
    Math.min(1, ...owned.filter((i) => i.tool?.skill === skill).map((i) => i.tool?.speed ?? 1));
  return {
    speed: (skill: SkillId) =>
      (activeBuff(s, "speed", at)?.power ?? 1) *
      toolSpeed(skill) *
      sky.reduce((m, i) => m * (i.constellation?.speed ?? 1), 1),
    damage:
      owned.reduce((sum, i) => sum + (i === weapon && dry ? 0 : (i.weaponDamage ?? 0)), 0) +
      sky.reduce((sum, i) => sum + (i.constellation?.damage ?? 0), 0) +
      (activeBuff(s, "damage", at)?.power ?? 0),
    armor:
      owned.reduce((sum, i) => sum + (i.armor ?? 0), 0) +
      sky.reduce((sum, i) => sum + (i.constellation?.armor ?? 0), 0),
    ammo: dry ? undefined : weapon?.ammo,
    weaponType: dry ? undefined : weapon?.damageType,
    armorType: s.equipped.body && count(s, s.equipped.body) > 0 ? ITEMS[s.equipped.body].damageType : undefined,
    yield: (activeBuff(s, "yield", at)?.power ?? 1) * sky.reduce((m, i) => m * (i.constellation?.yield ?? 1), 1),
    rare:
      rareBonus(s) *
      owned.reduce((m, i) => m * (i.rareBonus ?? 1), 1) *
      sky.reduce((m, i) => m * (i.constellation?.rare ?? 1), 1),
  };
}

export const rareChanceMult = (s: GameState) => modifiers(s).rare;

/** Share of time each Exploration level takes off the skills that go out and gather. */
export const EXPLORATION_SPEED_PER_LEVEL = 0.004;
const GATHERING: SkillId[] = ["salvaging", "mining", "foraging", "xenofishing"];

export function taskDurationMs(s: GameState, task: TaskDef, at = s.lastTick): number {
  let mult = modifiers(s, at).speed(task.skill) * speedBonus(s);
  if (task.skill === "engineering") mult *= 1 - 0.08 * buildingLevel(s, "workshop");
  if (GATHERING.includes(task.skill)) mult *= 1 - EXPLORATION_SPEED_PER_LEVEL * (levelOf(s, "exploration") - 1);
  if (hasMastery(task)) mult *= masterySpeed(masteryLevel(s, task)) * (1 - poolBonus(s, task.skill).speed);
  return Math.max(1000, Math.round(task.durationMs * mult));
}

/** The food the survivor eats first: the weakest by default, so strong food is not wasted. */
export function foodOwned(s: GameState, priority: FoodPriority = s.settings.foodPriority): ItemId | undefined {
  const sign = priority === "weakest" ? 1 : -1;
  return Object.values(ITEMS)
    .filter((i) => i.heal && count(s, i.id) > 0)
    .sort((a, b) => sign * ((a.heal ?? 0) - (b.heal ?? 0)))[0]?.id;
}

export function eat(s: GameState, id: ItemId | undefined = foodOwned(s)): { state: GameState; error?: string } {
  if (!id || count(s, id) < 1 || !ITEMS[id].heal) return { state: s, error: "No rations" };
  if (s.hp >= maxHp(s)) return { state: s, error: "Already at full health" };
  const next = structuredClone(s);
  next.inventory[id] = count(s, id) - 1;
  next.hp = Math.min(maxHp(s), s.hp + (ITEMS[id].heal ?? 0));
  return { state: next };
}

/** Drinks a potion. One buff of each kind runs at a time, and a weaker one cannot replace a stronger. */
export function drink(s: GameState, id: ItemId): { state: GameState; error?: string } {
  const potion = ITEMS[id].potion;
  if (!potion || count(s, id) < 1) return { state: s, error: "Nothing to drink" };
  const current = activeBuff(s, potion.kind);
  const weaker = current && (potion.kind === "speed" ? potion.power > current.power : potion.power < current.power);
  if (current && weaker) return { state: s, error: `A stronger ${ITEMS[current.item].name} is already working` };
  const next = structuredClone(s);
  next.inventory[id] = count(s, id) - 1;
  next.buffs[potion.kind] = {
    item: id,
    power: potion.power,
    expiresAt: s.lastTick + potion.durationMs,
  };
  return { state: next };
}
