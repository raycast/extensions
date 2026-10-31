import {
  ABANDON_COST,
  BOARD_BONUS,
  BOARD_REFRESH_MS,
  BOUNTY_LINES,
  MARKS_PER_KILL,
  POSTERS,
  REROLL_COST,
  TASK_BY_ID,
  TASKS,
  TIER_LEVELS,
} from "./data";
import { levelFromXp } from "./levels";
import { pick, randomInt } from "./rng";
import { Bounty, GameState, Report, TaskDef } from "./types";

export const boardLevel = (s: GameState) => s.buildings.bounty_board ?? 0;

/** How many bounties the board offers at once. */
export const boardCapacity = (s: GameState) => 2 + boardLevel(s);

/** Bounty XP needed for a bounty level. */
export const xpForBountyLevel = (level: number) => (level <= 1 ? 0 : 60 * (level - 1) ** 2);

export const bountyLevel = (s: GameState) => {
  let level = 1;
  while (s.bountyXp >= xpForBountyLevel(level + 1)) level++;
  return level;
};

/** Harder creatures pay better and sit in a higher tier. */
export const bountyTier = (task: TaskDef) => (task.levelReq < 8 ? 1 : task.levelReq < 20 ? 2 : 3);

/** The hunts a bounty can ask for: creatures you are strong enough to fight, in unlocked tiers. */
export function huntable(s: GameState): TaskDef[] {
  const level = levelFromXp(s.xp.combat);
  const bounty = bountyLevel(s);
  return TASKS.filter((t) => t.monster && !t.boss && t.levelReq <= level && TIER_LEVELS[bountyTier(t) - 1] <= bounty);
}

function makeBounty(s: GameState, avoid: string[]): Bounty | undefined {
  const all = huntable(s);
  const fresh = all.filter((t) => !avoid.includes(t.id));
  const target = pick(s, fresh.length ? fresh : all);
  if (!target?.monster) return undefined;
  const tier = bountyTier(target);
  const count = randomInt(s, 8, 20);
  const bonus = 1 + (BOARD_BONUS[boardLevel(s) - 1] ?? 0);
  return {
    id: s.board.nextId++,
    poster: pick(s, POSTERS),
    line: pick(s, BOUNTY_LINES).replaceAll("{m}", target.monster.name),
    task: target.id,
    count,
    tier,
    marks: Math.round(count * MARKS_PER_KILL[tier - 1] * bonus),
    xp: count * MARKS_PER_KILL[tier - 1],
  };
}

/** Tops the board up to its capacity. */
export function refillBoard(s: GameState) {
  if (boardLevel(s) === 0) return;
  while (s.board.offers.length < boardCapacity(s)) {
    const bounty = makeBounty(
      s,
      s.board.offers.map((o) => o.task),
    );
    if (!bounty) break;
    s.board.offers.push(bounty);
  }
}

/** Replaces the unclaimed offers once the timer has run out. */
export function refreshBoardIfDue(s: GameState) {
  if (boardLevel(s) === 0 || s.lastTick < s.board.refreshAt) return;
  s.board.offers = [];
  s.board.refreshAt = s.lastTick + BOARD_REFRESH_MS;
  refillBoard(s);
}

type Result = { state: GameState; error?: string };

export function acceptBounty(s: GameState, id: number): Result {
  if (s.board.active) return { state: s, error: "Finish or abandon your current bounty first" };
  const bounty = s.board.offers.find((o) => o.id === id);
  if (!bounty) return { state: s, error: "That bounty is no longer on the board" };
  const next = structuredClone(s);
  next.board.offers = next.board.offers.filter((o) => o.id !== id);
  next.board.active = { bounty, progress: 0 };
  return { state: next };
}

/** Drops the active bounty. It costs Marks, and the offer does not come back. */
export function abandonBounty(s: GameState): Result {
  if (!s.board.active) return { state: s, error: "No active bounty" };
  if (s.marks < ABANDON_COST) return { state: s, error: `Abandoning costs ${ABANDON_COST} Bounty Marks` };
  const next = structuredClone(s);
  next.marks -= ABANDON_COST;
  next.board.active = null;
  refillBoard(next);
  return { state: next };
}

/** Swaps every unclaimed offer for new ones, for a few Marks. */
export function rerollBoard(s: GameState): Result {
  if (boardLevel(s) === 0) return { state: s, error: "Build a Bounty Board first" };
  if (s.marks < REROLL_COST) return { state: s, error: `Rerolling costs ${REROLL_COST} Bounty Marks` };
  const next = structuredClone(s);
  next.marks -= REROLL_COST;
  next.board.offers = [];
  refillBoard(next);
  return { state: next };
}

/** Called for every kill. Counts towards the active bounty and pays out when it is done. */
export function onKill(s: GameState, task: TaskDef, report: Report) {
  const active = s.board.active;
  if (!active || active.bounty.task !== task.id) return;
  active.progress++;
  if (active.progress < active.bounty.count) return;
  const before = bountyLevel(s);
  s.marks += active.bounty.marks;
  s.bountyXp += active.bounty.xp;
  s.stats.bounties++;
  const after = bountyLevel(s);
  report.bounties.push({
    poster: active.bounty.poster,
    marks: active.bounty.marks,
    level: after > before ? after : undefined,
  });
  s.board.active = null;
  refillBoard(s);
}

/** The target of a bounty, for display. */
export const bountyTarget = (b: Bounty) => TASK_BY_ID[b.task];
