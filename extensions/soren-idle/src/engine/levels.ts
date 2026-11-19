import { MAX_LEVEL } from "./data";

/** The RuneScape-style XP curve: level 99 is 13,034,431 XP, and half of that is level 92. */
const XP_TABLE: number[] = [0, 0];
for (let level = 2, points = 0; level <= MAX_LEVEL; level++) {
  const i = level - 1;
  points += Math.floor(i + 300 * 2 ** (i / 7));
  XP_TABLE.push(Math.floor(points / 4));
}

export function xpForLevel(level: number): number {
  return XP_TABLE[Math.min(Math.max(1, level), MAX_LEVEL)];
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= XP_TABLE[level + 1]) level++;
  return level;
}
