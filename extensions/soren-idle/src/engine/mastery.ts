import { MAX_LEVEL } from "./data";
import { xpForLevel } from "./levels";
import { GameState, TaskDef } from "./types";

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
export const masteryYield = (level: number) =>
  YIELD_PER_LEVEL_STEP * YIELD_LEVELS.filter((l) => level >= l).length;

export const MASTERY_MAX = MAX_LEVEL;

// --- resource nodes -----------------------------------------------------------

/** How much a node holds at full health: its base, and one more for every mastery level past the first. */
export const nodeMaxHp = (s: GameState, task: TaskDef) =>
  task.node ? task.node.hp + masteryLevel(s, task) - 1 : 0;

/** The node's health right now. Untouched or fully respawned nodes are at full health. */
export const nodeHp = (s: GameState, task: TaskDef) => {
  const node = s.nodes[task.id];
  return node && (node.respawnAt === undefined || node.respawnAt > s.lastTick)
    ? node.hp
    : nodeMaxHp(s, task);
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
