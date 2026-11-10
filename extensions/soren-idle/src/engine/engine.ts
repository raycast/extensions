import {
  BUILDING_BY_ID,
  BUILDINGS,
  CONTACT_DELAY_MS,
  BOARD_REFRESH_MS,
  ITEMS,
  MAX_LEVEL,
  MAX_OFFLINE_MS,
  OFFLINE_BONUS_HOURS,
  STORAGE_CAPS,
  SAVE_VERSION,
  SKILLS,
  TASK_BY_ID,
} from "./data";
import { bossLockReason, matchup } from "./areas";
import { onKill, refillBoard, refreshBoardIfDue } from "./bounty";
import { levelFromXp, xpForLevel } from "./levels";
import {
  averageCycleMs,
  masteryLevel,
  masterySpeed,
  masteryXpPerCycle,
  masteryYield,
  hasMastery,
  nodeMaxHp,
} from "./mastery";
import { emptyReport, mergeReports } from "./report";
import { nextRandom } from "./rng";
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

const FOOD_HEAL_THRESHOLD = 0.5;
const REGEN_HP_PER_MS = 0.2 / 1000;
const SHELTER_REGEN_HP_PER_MS = 0.15 / 1000;

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
    settings: { eatBelow: 0, foodPriority: "weakest" },
    mastery: {},
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

export const maxHp = (s: GameState) => maxHpFor(s.xp.combat) + 10 * buildingLevel(s, "shelter");

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
function addItems(s: GameState, bundle: Bundle = {}, sign: 1 | -1 = 1, report?: Report) {
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
  const toolSpeed = (skill: SkillId) =>
    Math.min(1, ...owned.filter((i) => i.tool?.skill === skill).map((i) => i.tool?.speed ?? 1));
  return {
    speed: (skill: SkillId) => (activeBuff(s, "speed", at)?.power ?? 1) * toolSpeed(skill),
    damage: owned.reduce((sum, i) => sum + (i.weaponDamage ?? 0), 0) + (activeBuff(s, "damage", at)?.power ?? 0),
    armor: owned.reduce((sum, i) => sum + (i.armor ?? 0), 0),
    weaponType: s.equipped.weapon && count(s, s.equipped.weapon) > 0 ? ITEMS[s.equipped.weapon].damageType : undefined,
    armorType: s.equipped.body && count(s, s.equipped.body) > 0 ? ITEMS[s.equipped.body].damageType : undefined,
    yield: activeBuff(s, "yield", at)?.power ?? 1,
    rare: owned.reduce((m, i) => m * (i.rareBonus ?? 1), 1),
  };
}

export const rareChanceMult = (s: GameState) => modifiers(s).rare;

export function taskDurationMs(s: GameState, task: TaskDef, at = s.lastTick): number {
  let mult = modifiers(s, at).speed(task.skill);
  if (task.skill === "engineering") mult *= 1 - 0.08 * buildingLevel(s, "workshop");
  if (hasMastery(task)) mult *= masterySpeed(masteryLevel(s, task));
  return Math.max(1000, Math.round(task.durationMs * mult));
}

export const playerDamage = (s: GameState, at = s.lastTick) =>
  3 + combatTier(levelOf(s, "combat")) + modifiers(s, at).damage;

export const playerArmor = (s: GameState, at = s.lastTick) => modifiers(s, at).armor;

/** Damage per round against this creature, after the combat triangle. */
export function damageAgainst(s: GameState, task: TaskDef, at = s.lastTick): number {
  const m = task.monster;
  const base = playerDamage(s, at);
  return m ? Math.max(1, Math.round(base * matchup(modifiers(s, at).weaponType, m.type))) : base;
}

/** Damage per enemy hit once your armor and the combat triangle are counted. */
export function hitDamage(s: GameState, task: TaskDef, at = s.lastTick): number {
  const m = task.monster;
  if (!m) return 0;
  const mods = modifiers(s, at);
  return Math.max(1, Math.round(m.damage * matchup(m.type, mods.armorType)) - mods.armor);
}

/** Expected damage taken in a fight against this task's monster. */
export function fightDamage(s: GameState, task: TaskDef, at = s.lastTick): number {
  const m = task.monster;
  if (!m) return 0;
  const rounds = Math.ceil(m.hp / damageAgainst(s, task, at));
  return Math.ceil(rounds * hitDamage(s, task, at) * 0.4);
}

/** A yield potion's bonus: whole extras, plus a chance of one more for the fraction. */
function boostYield(s: GameState, bundle: Bundle = {}, mult: number): Bundle {
  if (mult <= 1) return bundle;
  const boosted: Bundle = {};
  for (const [id, n] of Object.entries(bundle) as [ItemId, number][]) {
    const exact = n * mult;
    boosted[id] = Math.floor(exact) + (nextRandom(s) < exact - Math.floor(exact) ? 1 : 0);
  }
  return boosted;
}

export interface TaskRates {
  xpPerHour: number;
  /** What one hour of this task makes (outputs, or monster drops). */
  itemsPerHour: Bundle;
  /** What one hour of this task uses up. */
  inputsPerHour: Bundle;
  /** Expected HP lost per hour in combat. */
  hpLossPerHour: number;
  /** Time to the next level at this rate, or null at the level cap. */
  nextLevelMs: number | null;
}

const scaleBundle = (bundle: Bundle = {}, k: number): Bundle =>
  Object.fromEntries(Object.entries(bundle).map(([id, n]) => [id, n * k]));

/** What doing this task nonstop would give per hour, at your current gear. */
export function taskRates(s: GameState, task: TaskDef): TaskRates {
  const perHour = 3_600_000 / averageCycleMs(s, task, taskDurationMs(s, task));
  const level = levelOf(s, task.skill);
  const xpPerHour = task.xp * perHour;
  return {
    xpPerHour,
    itemsPerHour: scaleBundle(task.monster ? task.monster.drops : task.outputs, perHour),
    inputsPerHour: scaleBundle(task.inputs, perHour),
    hpLossPerHour: task.monster ? fightDamage(s, task) * perHour : 0,
    nextLevelMs:
      level >= MAX_LEVEL ? null : Math.ceil(((xpForLevel(level + 1) - s.xp[task.skill]) / xpPerHour) * 3_600_000),
  };
}

// --- actions ----------------------------------------------------------------

export function startTask(s: GameState, taskId: string, runs?: number): { state: GameState; error?: string } {
  const task = TASK_BY_ID[taskId];
  if (!task) return { state: s, error: "Unknown task" };
  if (levelOf(s, task.skill) < task.levelReq) return { state: s, error: `Requires level ${task.levelReq}` };
  if (task.once && task.outputs && (Object.keys(task.outputs) as ItemId[]).every((id) => count(s, id) > 0)) {
    return { state: s, error: "You already own this" };
  }
  if (!canAfford(s, task.inputs)) return { state: s, error: "Missing materials" };
  const locked = bossLockReason(s, task);
  if (locked) return { state: s, error: locked };
  if (task.boss && s.hp <= fightDamage(s, task))
    return { state: s, error: "Too wounded for this fight. Eat first, there is no food mid-fight" };
  const limit = task.once ? 1 : runs && runs > 0 ? Math.floor(runs) : null;
  return { state: { ...s, activeTask: taskId, taskProgressMs: 0, taskRemaining: limit } };
}

export function stopTask(s: GameState): GameState {
  return { ...s, activeTask: null, taskProgressMs: 0, taskRemaining: null };
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

// --- simulation -------------------------------------------------------------

export function gainXp(s: GameState, skill: SkillId, amount: number, report: Report) {
  const before = levelFromXp(s.xp[skill]);
  s.xp[skill] += amount;
  report.xp[skill] = (report.xp[skill] ?? 0) + amount;
  const after = levelFromXp(s.xp[skill]);
  for (let level = before + 1; level <= after; level++) report.levelUps.push({ skill, level });
  if (skill === "combat" && after > before)
    s.hp = Math.min(maxHp(s), s.hp + 5 * (combatTier(after) - combatTier(before)));
}

/** Rolls the task's rare drops for one cycle. */
function rollRareDrops(s: GameState, task: TaskDef, report: Report, at: number) {
  const mult = modifiers(s, at).rare;
  for (const drop of task.rareDrops ?? []) {
    if (nextRandom(s) >= drop.chance * mult) continue;
    const before = count(s, drop.item);
    addItems(s, { [drop.item]: 1 }, 1, report);
    if (count(s, drop.item) > before) report.rare[drop.item] = (report.rare[drop.item] ?? 0) + 1;
  }
}

/** One cycle is one hit on a resource node. A spent node comes back after its respawn time. */
function hitNode(s: GameState, task: TaskDef, endsAt: number) {
  if (!task.node) return;
  const node = (s.nodes[task.id] ??= { hp: nodeMaxHp(s, task) });
  if (--node.hp <= 0) node.respawnAt = endsAt + task.node.respawnMs;
}

/** How long until the task's node can be worked again, as seen at time `at`. A node that is back is reset. */
function nodeWaitMs(s: GameState, task: TaskDef, at: number): number {
  const respawnAt = s.nodes[task.id]?.respawnAt;
  if (respawnAt === undefined) return 0;
  if (at >= respawnAt) {
    delete s.nodes[task.id];
    return 0;
  }
  return respawnAt - at;
}

/** Runs one cycle of a task that starts at time `at`. Returns a reason if the task cannot continue. */
function runCycle(s: GameState, task: TaskDef, report: Report, at: number): string | undefined {
  const cycle = emptyReport();
  const stop = runCycleInto(s, task, cycle, at);
  if (stop) return stop;
  cycle.skills[task.skill] = {
    ms: 0,
    cycles: 1,
    xp: cycle.xp[task.skill] ?? 0,
    items: { ...cycle.items },
  };
  mergeReports(report, cycle);
  return undefined;
}

function runCycleInto(s: GameState, task: TaskDef, report: Report, at: number): string | undefined {
  const yieldMult = task.once ? 1 : modifiers(s, at).yield + masteryYield(masteryLevel(s, task));
  if (task.monster) {
    const damage = fightDamage(s, task, at);
    const wantsFood = () => s.hp <= damage * (1 + FOOD_HEAL_THRESHOLD) || s.hp < s.settings.eatBelow * maxHp(s);
    // Bosses are fought without a break: no eating until the fight is over.
    for (let food = foodOwned(s); !task.boss && food && wantsFood() && s.hp < maxHp(s); food = foodOwned(s)) {
      s.inventory[food] = count(s, food) - 1;
      s.hp = Math.min(maxHp(s), s.hp + (ITEMS[food].heal ?? 0));
    }
    if (s.hp <= damage) {
      s.stats.retreats++;
      return `Retreated from ${task.monster.name}: too wounded and out of rations`;
    }
    const drops = boostYield(s, task.monster.drops, yieldMult);
    const full = overflowing(s, drops);
    if (full) return `Storage full: ${ITEMS[full].name}. Sell or use some to continue`;
    s.hp -= damage;
    s.stats.kills++;
    s.stats.hunts[task.id] = (s.stats.hunts[task.id] ?? 0) + 1;
    addItems(s, drops, 1, report);
    onKill(s, task, report);
  } else {
    if (!canAfford(s, task.inputs)) return `Out of materials for ${task.name}`;
    const outputs = boostYield(s, task.outputs, yieldMult);
    const full = overflowing(s, outputs);
    if (full) return `Storage full: ${ITEMS[full].name}. Sell or use some to continue`;
    addItems(s, task.inputs, -1);
    addItems(s, outputs, 1, report);
    for (const id of Object.keys(outputs) as ItemId[]) autoEquip(s, id);
  }
  rollRareDrops(s, task, report, at);
  gainXp(s, task.skill, task.xp, report);
  hitNode(s, task, at + taskDurationMs(s, task, at));
  if (hasMastery(task)) s.mastery[task.id] = (s.mastery[task.id] ?? 0) + masteryXpPerCycle(task);
  s.stats.cycles++;
  report.cycles++;
  return undefined;
}

export { emptyReport };

/** Advances the game to `now`, running as many task cycles as the elapsed time allows. */
export function advance(prev: GameState, now: number): { state: GameState; report: Report } {
  const s = structuredClone(prev);
  const report = emptyReport();
  const elapsed = Math.min(Math.max(0, now - s.lastTick), offlineCapMs(s));
  s.lastTick = now;
  report.elapsedMs = elapsed;
  if (!firstContact(prev) && firstContact(s)) {
    report.notices.push("Strangers are approaching your camp. The locals answered your signal.");
  }

  const task = s.activeTask ? TASK_BY_ID[s.activeTask] : undefined;
  const regen =
    (task?.skill === "combat" ? 0 : REGEN_HP_PER_MS) + SHELTER_REGEN_HP_PER_MS * buildingLevel(s, "shelter");

  // Drones work whatever the survivor is doing, and their haul can feed the active task. They and
  // the survivor's healing are settled in time order, as regular ticks would: a cycle sees what the
  // drones hauled and how much the survivor has healed up to the moment it finishes.
  const carried = { ...s.passive };
  let settled = 0;
  const settle = (to: number) => {
    const upTo = Math.min(Math.max(to, settled), elapsed);
    if (upTo <= settled) return;
    s.hp = Math.min(maxHp(s), s.hp + (upTo - settled) * regen);
    for (const def of BUILDINGS) {
      const level = buildingLevel(s, def.id);
      if (!def.produces || level === 0) continue;
      // Worked out from the start of the absence each time, so slices add up with no drift.
      const rate = (level * (def.powerUse ? powerEfficiency(s) : 1)) / def.produces.everyMs;
      const before = (carried[def.id] ?? 0) + settled * rate;
      const after = (carried[def.id] ?? 0) + upTo * rate;
      const whole = Math.floor(after) - Math.floor(before);
      s.passive[def.id] = after - Math.floor(after);
      if (whole > 0) {
        const haul = emptyReport();
        addItems(s, { [def.produces.item]: whole }, 1, haul);
        mergeReports(report, { ...emptyReport(), items: haul.items, passive: haul.items });
      }
    }
    settled = upTo;
  };
  if (!task) {
    settle(elapsed);
    return finish(s, report);
  }

  if (task.once && s.taskRemaining === null) s.taskRemaining = 1;
  let remaining = s.taskProgressMs + elapsed;
  // Potions run out partway through a long absence, so each cycle knows when it started.
  const windowStart = prev.lastTick - s.taskProgressMs;
  let done = 0;
  // Tool crafted mid-run changes duration, so recompute each cycle.
  while (s.activeTask) {
    const wait = nodeWaitMs(s, task, windowStart + done);
    if (wait > 0) {
      // The node is spent: the rest of the time passes waiting for it to come back.
      const waited = Math.min(wait, remaining);
      remaining -= waited;
      done += waited;
      if (waited < wait) break;
      delete s.nodes[task.id];
    }
    const at = windowStart + done;
    const duration = taskDurationMs(s, task, at);
    if (remaining < duration) break;
    settle(done + duration - prev.taskProgressMs);
    const stopReason = runCycle(s, task, report, at);
    if (stopReason) {
      report.stoppedReason = stopReason;
      s.activeTask = null;
      break;
    }
    remaining -= duration;
    done += duration;
    if (s.taskRemaining !== null && --s.taskRemaining <= 0) {
      report.completed = `Finished ${task.name}`;
      s.activeTask = null;
      break;
    }
  }
  settle(elapsed);
  const worked = Math.max(0, done + (s.activeTask ? remaining : 0) - prev.taskProgressMs);
  if (worked > 0) (report.skills[task.skill] ??= { ms: 0, cycles: 0, xp: 0, items: {} }).ms = worked;
  s.taskProgressMs = s.activeTask ? remaining : 0;
  if (!s.activeTask) s.taskRemaining = null;
  return finish(s, report);
}

/** Folds what the report gained into the lifetime totals. */
function finish(s: GameState, report: Report): { state: GameState; report: Report } {
  refreshBoardIfDue(s);
  // A potion stays while the cycle in progress started under it, so that cycle still finishes with it.
  const cycleStart = s.activeTask ? s.lastTick - s.taskProgressMs : s.lastTick;
  for (const kind of Object.keys(s.buffs) as BuffKind[]) if (!activeBuff(s, kind, cycleStart)) delete s.buffs[kind];
  for (const [id, n] of Object.entries(report.items) as [ItemId, number][])
    s.stats.produced[id] = (s.stats.produced[id] ?? 0) + n;
  return { state: s, report };
}
