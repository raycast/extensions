import { ITEMS, riftScale } from "./data";
import { matchup } from "./areas";
import { combatTier, count, foodOwned, levelOf, maxHp, modifiers } from "./core";
import { nextRandom } from "./rng";
import { GameState, ItemId, TaskDef } from "./types";

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
  return Math.max(1, Math.round(m.damage * riftScale(s) * matchup(m.type, mods.armorType)) - mods.armor);
}

/** Expected damage taken in a fight against this task's monster. */
export function fightDamage(s: GameState, task: TaskDef, at = s.lastTick): number {
  const m = task.monster;
  if (!m) return 0;
  const rounds = Math.ceil((m.hp * riftScale(s)) / damageAgainst(s, task, at)) / playerHitChance(s, at);
  return Math.ceil(rounds * enemyHitChance(s, task, at) * hitDamage(s, task, at));
}

/** Your swing lands 50% of the time with no weapon bonus, and a better weapon pushes that towards the cap. */
const PLAYER_HIT_BASE = 0.5;
const PLAYER_HIT_PER_DAMAGE = 0.015;
const PLAYER_HIT_MAX = 0.95;
/** A creature hits 50% of the time against no armor. Armor equal to half its damage cuts that to under a fifth. */
const ENEMY_HIT_BASE = 0.5;
const ARMOR_WEIGHT = 2;
/** Even the weakest creature gets a swing in now and then. */
const ENEMY_HIT_MIN = 0.05;

/** Chance each of your swings lands, from your weapon, companion and buffs. */
export const playerHitChance = (s: GameState, at = s.lastTick) =>
  Math.min(PLAYER_HIT_MAX, PLAYER_HIT_BASE + PLAYER_HIT_PER_DAMAGE * modifiers(s, at).damage);

/** Chance each of this creature's swings lands: armor weighs against how hard it hits, and never reaches zero. */
export function enemyHitChance(s: GameState, task: TaskDef, at = s.lastTick): number {
  const m = task.monster;
  if (!m) return 0;
  const power = m.damage * riftScale(s);
  return Math.max(ENEMY_HIT_MIN, (ENEMY_HIT_BASE * power) / (power + ARMOR_WEIGHT * playerArmor(s, at)));
}

/** A hit lands for between 75% and 125% of its usual damage. */
const spread = (s: GameState) => 0.75 + 0.5 * nextRandom(s);
/** Share of the creature's drops you are carrying that you lose when it beats you. */
const DEFEAT_LOSS = 0.1;

/**
 * Plays out one fight round by round, taking the damage off `s.hp`. The survivor eats rather than fall,
 * except against a boss. Returns false when the creature wins.
 */
export function rollFight(s: GameState, task: TaskDef, at: number): boolean {
  const dealt = damageAgainst(s, task, at);
  const hit = hitDamage(s, task, at);
  const mine = playerHitChance(s, at);
  const theirs = enemyHitChance(s, task, at);
  let foe = task.monster!.hp * riftScale(s);
  while (foe > 0) {
    if (nextRandom(s) < mine) foe -= dealt * spread(s);
    if (foe <= 0 || nextRandom(s) >= theirs) continue;
    const blow = Math.max(1, Math.round(hit * spread(s)));
    for (let food = foodOwned(s); !task.boss && food && s.hp <= blow && s.hp < maxHp(s); food = foodOwned(s)) {
      s.inventory[food] = count(s, food) - 1;
      s.hp = Math.min(maxHp(s), s.hp + (ITEMS[food].heal ?? 0));
    }
    s.hp -= blow;
    if (s.hp <= 0) return false;
  }
  return true;
}

/** A defeat costs a share of the creature's drops in your inventory. Returns what was lost, for the log. */
export function loseDrops(s: GameState, task: TaskDef): string {
  const lost: string[] = [];
  for (const id of Object.keys(task.monster!.drops) as ItemId[]) {
    const n = Math.floor(count(s, id) * DEFEAT_LOSS);
    if (n < 1) continue;
    s.inventory[id] = count(s, id) - n;
    lost.push(`${n} ${ITEMS[id].name}`);
  }
  return lost.length ? `, dropped ${lost.join(", ")}` : "";
}
