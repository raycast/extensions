import { MAX_LEVEL, petBonus, TASK_BY_ID, xpBonus } from "./data";
import { bossLockReason } from "./areas";
import { xpForLevel } from "./levels";
import { averageCycleMs } from "./mastery";
import { canAfford, count, levelOf, modifiers, taskDurationMs } from "./core";
import { fightDamage } from "./combat";
import { Bundle, GameState, ItemId, TaskDef } from "./types";

/** How many started tasks the menu bar remembers. */
export const RECENT_TASKS = 5;

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
  const ammo = modifiers(s).ammo;
  const level = levelOf(s, task.skill);
  const xpPerHour = task.xp * xpBonus(s) * petBonus(s, task.skill) * perHour;
  return {
    xpPerHour,
    itemsPerHour: scaleBundle(task.monster ? task.monster.drops : task.outputs, perHour),
    inputsPerHour: scaleBundle(
      { ...task.inputs, ...(task.monster && ammo ? { [ammo]: (task.inputs?.[ammo] ?? 0) + 1 } : {}) },
      perHour,
    ),
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
  const recentTasks = [taskId, ...s.recentTasks.filter((id) => id !== taskId)].slice(0, RECENT_TASKS);
  return { state: { ...s, activeTask: taskId, taskProgressMs: 0, taskRemaining: limit, recentTasks } };
}

export function stopTask(s: GameState): GameState {
  return { ...s, activeTask: null, taskProgressMs: 0, taskRemaining: null };
}
