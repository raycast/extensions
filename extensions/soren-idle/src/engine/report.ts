import { Bundle, ItemId, Report, SkillReport } from "./types";

export function emptyReport(): Report {
  return {
    elapsedMs: 0,
    cycles: 0,
    items: {},
    passive: {},
    skills: {},
    rare: {},
    xp: {},
    levelUps: [],
    notices: [],
    bounties: [],
  };
}

function addBundle(into: Bundle, from: Bundle) {
  for (const [id, n] of Object.entries(from) as [ItemId, number][]) into[id] = (into[id] ?? 0) + n;
}

/** Adds everything in `add` to `into`. Changes `into` and returns it. */
export function mergeReports(into: Report, add: Report): Report {
  into.elapsedMs += add.elapsedMs;
  into.cycles += add.cycles;
  addBundle(into.items, add.items);
  addBundle(into.passive, add.passive);
  addBundle(into.rare, add.rare);
  for (const [skill, n] of Object.entries(add.xp) as [keyof Report["xp"], number][])
    into.xp[skill] = (into.xp[skill] ?? 0) + n;
  for (const [skill, part] of Object.entries(add.skills) as [keyof Report["skills"], SkillReport][]) {
    const mine = (into.skills[skill] ??= { ms: 0, cycles: 0, xp: 0, items: {} });
    mine.ms += part.ms;
    mine.cycles += part.cycles;
    mine.xp += part.xp;
    addBundle(mine.items, part.items);
  }
  into.levelUps.push(...add.levelUps);
  into.notices.push(...add.notices);
  into.bounties.push(...add.bounties);
  into.stoppedReason = add.stoppedReason ?? into.stoppedReason;
  into.completed = add.completed ?? into.completed;
  return into;
}

/** True if nothing worth telling the player happened. */
export const isQuiet = (r: Report) =>
  r.cycles === 0 &&
  Object.keys(r.passive).length === 0 &&
  r.levelUps.length === 0 &&
  r.notices.length === 0 &&
  r.bounties.length === 0 &&
  !r.stoppedReason &&
  !r.completed;
