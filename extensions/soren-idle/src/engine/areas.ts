import { AREAS, BEATS, TASK_BY_ID } from "./data";
import { AreaDef, DamageType, GameState, TaskDef } from "./types";

export const areaOf = (taskId: string): AreaDef | undefined =>
  AREAS.find((a) => a.boss === taskId || a.hunts.includes(taskId));

/** Kills made across an area's regular hunts. */
export const areaKills = (s: GameState, area: AreaDef) =>
  area.hunts.reduce((sum, id) => sum + (s.stats.hunts[id] ?? 0), 0);

/** Why the boss is not available yet, or undefined once it is. */
export function bossLockReason(s: GameState, task: TaskDef): string | undefined {
  if (!task.boss) return undefined;
  const area = areaOf(task.id);
  if (!area) return undefined;
  const kills = areaKills(s, area);
  return kills >= area.bossKills
    ? undefined
    : `Hunt ${area.bossKills - kills} more in ${area.name} to draw it out`;
}

export const huntsOf = (area: AreaDef): TaskDef[] => area.hunts.map((id) => TASK_BY_ID[id]);

/** 1.25 when `attacker` beats `defender`, 0.8 when it loses, 1 otherwise or if either is untyped. */
export function matchup(attacker?: DamageType, defender?: DamageType): number {
  if (!attacker || !defender) return 1;
  if (BEATS[attacker] === defender) return 1.25;
  if (BEATS[defender] === attacker) return 0.8;
  return 1;
}

/** The type that beats a given one. */
export const counterTo = (type: DamageType): DamageType =>
  (Object.keys(BEATS) as DamageType[]).find((t) => BEATS[t] === type) as DamageType;
