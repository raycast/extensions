import { BUILDINGS, yieldBonus, RIFT_YIELD, TASK_BY_ID, xpBonus, petBonus, ITEMS } from "./data";
import { checkAchievements, rollPet } from "./collection";
import { onKill, refreshBoardIfDue } from "./bounty";
import { levelFromXp } from "./levels";
import { masteryLevel, poolBonus, POOL_SHARE, masteryXpPerCycle, masteryYield, hasMastery, nodeMaxHp } from "./mastery";
import { emptyReport, mergeReports } from "./report";
import { nextRandom } from "./rng";
import {
  activeBuff,
  addItems,
  autoEquip,
  buildingLevel,
  canAfford,
  combatTier,
  count,
  firstContact,
  foodOwned,
  maxHp,
  modifiers,
  offlineCapMs,
  overflowing,
  powerEfficiency,
  taskDurationMs,
} from "./core";
import { fightDamage, rollFight, loseDrops } from "./combat";
import { BuffKind, Bundle, GameState, ItemId, Report, SkillId, TaskDef } from "./types";

const FOOD_HEAL_THRESHOLD = 0.5;
const REGEN_HP_PER_MS = 0.2 / 1000;
const SHELTER_REGEN_HP_PER_MS = 0.15 / 1000;

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

export function gainXp(s: GameState, skill: SkillId, amount: number, report: Report) {
  const before = levelFromXp(s.xp[skill]);
  amount *= xpBonus(s) * petBonus(s, skill);
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
  const yieldMult = task.once
    ? 1
    : modifiers(s, at).yield +
      masteryYield(masteryLevel(s, task)) +
      poolBonus(s, task.skill).yield +
      RIFT_YIELD * s.launches +
      yieldBonus(s);
  if (task.monster) {
    const damage = fightDamage(s, task, at);
    if (!canAfford(s, task.inputs)) return `Out of materials for ${task.name}`;
    const wantsFood = () => s.hp <= damage * (1 + FOOD_HEAL_THRESHOLD) || s.hp < s.settings.eatBelow * maxHp(s);
    // Bosses are fought without a break: no eating until the fight is over.
    for (let food = foodOwned(s); !task.boss && food && wantsFood() && s.hp < maxHp(s); food = foodOwned(s)) {
      s.inventory[food] = count(s, food) - 1;
      s.hp = Math.min(maxHp(s), s.hp + (ITEMS[food].heal ?? 0));
    }
    // Ordinary fights are survived by eating between hits, so only bosses and the unfed need the HP up front.
    if ((task.boss || !foodOwned(s)) && s.hp <= damage) {
      s.stats.retreats++;
      return `Retreated from ${task.monster.name}: too wounded and out of rations`;
    }
    const drops = boostYield(s, task.monster.drops, yieldMult);
    const full = overflowing(s, drops);
    if (full) return `Storage full: ${ITEMS[full].name}. Sell or use some to continue`;
    const won = rollFight(s, task, at);
    addItems(s, task.inputs, -1);
    const ammo = modifiers(s, at).ammo;
    if (ammo) s.inventory[ammo] = count(s, ammo) - 1;
    if (!won) {
      s.hp = 1;
      s.stats.retreats++;
      return `Defeated by ${task.monster.name}${loseDrops(s, task)}`;
    }
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
  rollPet(s, task.skill, report);
  gainXp(s, task.skill, task.xp, report);
  hitNode(s, task, at + taskDurationMs(s, task, at));
  if (hasMastery(task)) {
    const gain = masteryXpPerCycle(task);
    s.mastery[task.id] = (s.mastery[task.id] ?? 0) + gain;
    s.masteryPool[task.skill] = (s.masteryPool[task.skill] ?? 0) + gain * POOL_SHARE;
  }
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
  checkAchievements(s, report);
  return { state: s, report };
}
