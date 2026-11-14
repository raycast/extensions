import { MAX_LEVEL, TASKS } from "./data";
import { xpForLevel } from "./levels";
import { GameState, SkillId, TaskDef } from "./types";

/** Mastery uses the skill curve at a twentieth of the cost: 99 is about 650k XP. */
const XP_DIVISOR = 20;
/** Mastery XP earned per second of a task's base duration. */
const XP_PER_SECOND = 1.5;
/** Every ten mastery levels shave this share off the task's time. */
const SPEED_PER_TEN_LEVELS = 0.025;
/** Mastery levels that each add a bit of bonus yield, and how much each adds. */
export const YIELD_LEVELS = [25, 50, 75, 99];
export const YIELD_PER_LEVEL_STEP = 0.03;

export const masteryXpForLevel = (level: number) => Math.floor(xpForLevel(level) / XP_DIVISOR);

export function masteryLevelFromXp(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= masteryXpForLevel(level + 1)) level++;
  return level;
}

/** Combat and one-off crafts have no mastery. */
export const hasMastery = (task: TaskDef) => !task.once && task.skill !== "combat";

export const masteryXp = (s: GameState, task: TaskDef) => s.mastery[task.id] ?? 0;

export const masteryLevel = (s: GameState, task: TaskDef) =>
  hasMastery(task) ? masteryLevelFromXp(masteryXp(s, task)) : 0;

/** Mastery XP one finished cycle gives. */
export const masteryXpPerCycle = (task: TaskDef) => (task.durationMs / 1000) * XP_PER_SECOND;

/** Multiplier on a task's time at this mastery level. */
export const masterySpeed = (level: number) => 1 - SPEED_PER_TEN_LEVELS * Math.floor(level / 10);

/** Extra yield (a chance of one more of each output) at this mastery level. */
export const masteryYield = (level: number) => YIELD_PER_LEVEL_STEP * YIELD_LEVELS.filter((l) => level >= l).length;

export const MASTERY_MAX = MAX_LEVEL;

// --- resource nodes -----------------------------------------------------------

/** How much a node holds at full health: its base, and one more for every mastery level past the first. */
export const nodeMaxHp = (s: GameState, task: TaskDef) => (task.node ? task.node.hp + masteryLevel(s, task) - 1 : 0);

/** The node's health right now. Untouched or fully respawned nodes are at full health. */
export const nodeHp = (s: GameState, task: TaskDef) => {
  const node = s.nodes[task.id];
  return node && (node.respawnAt === undefined || node.respawnAt > s.lastTick) ? node.hp : nodeMaxHp(s, task);
};

/** Milliseconds until the node is back, or 0 if it can be worked. */
export const nodeRespawnMs = (s: GameState, task: TaskDef) => {
  const at = s.nodes[task.id]?.respawnAt;
  return at === undefined ? 0 : Math.max(0, at - s.lastTick);
};

/**
 * How long a cycle takes on average once the wait for the node to respawn is spread over the hits
 * it gives. This is what the per-hour numbers are based on.
 */
export const averageCycleMs = (s: GameState, task: TaskDef, durationMs: number) =>
  task.node ? durationMs + task.node.respawnMs / nodeMaxHp(s, task) : durationMs;

// --- mastery pool -------------------------------------------------------------

/** Share of every mastery XP gain that also fills the skill's pool. */
export const POOL_SHARE = 0.25;

/** Skill-wide bonuses that stay on while the pool holds this share of its capacity. Spending the pool can lose them. */
export const POOL_CHECKPOINTS: { at: number; speed?: number; yield?: number }[] = [
  { at: 0.1, speed: 0.03 },
  { at: 0.25, yield: 0.03 },
  { at: 0.5, speed: 0.03 },
  { at: 0.95, speed: 0.03, yield: 0.05 },
];

/** A pool is full when every task of the skill has been taken to mastery 99. */
export const poolMax = (skill: SkillId) =>
  TASKS.filter((t) => t.skill === skill && hasMastery(t)).length * masteryXpForLevel(MAX_LEVEL) * POOL_SHARE;

export const poolXp = (s: GameState, skill: SkillId) => s.masteryPool[skill] ?? 0;

export const poolShare = (s: GameState, skill: SkillId) => {
  const max = poolMax(skill);
  return max > 0 ? poolXp(s, skill) / max : 0;
};

/** The skill-wide speed and yield the pool gives right now. */
export function poolBonus(s: GameState, skill: SkillId): { speed: number; yield: number } {
  const share = poolShare(s, skill);
  const active = POOL_CHECKPOINTS.filter((c) => share >= c.at);
  return {
    speed: active.reduce((sum, c) => sum + (c.speed ?? 0), 0),
    yield: active.reduce((sum, c) => sum + (c.yield ?? 0), 0),
  };
}

/** Pool XP it takes to lift a task one mastery level, or null when it cannot be raised. */
export function spendCost(s: GameState, task: TaskDef): number | null {
  if (!hasMastery(task)) return null;
  const level = masteryLevel(s, task);
  return level >= MASTERY_MAX ? null : Math.ceil(masteryXpForLevel(level + 1) - masteryXp(s, task));
}

/** Pays pool XP to raise a task one mastery level. */
export function spendPool(s: GameState, taskId: string): { state: GameState; error?: string } {
  const task = TASKS.find((t) => t.id === taskId);
  const cost = task ? spendCost(s, task) : null;
  if (!task || cost === null) return { state: s, error: "This task has no mastery to raise" };
  if (poolXp(s, task.skill) < cost) return { state: s, error: `Needs ${cost.toLocaleString("en-US")} pool XP` };
  return {
    state: {
      ...s,
      mastery: { ...s.mastery, [task.id]: masteryXp(s, task) + cost },
      masteryPool: { ...s.masteryPool, [task.skill]: poolXp(s, task.skill) - cost },
    },
  };
}
