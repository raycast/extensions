import { BUILDINGS, ITEMS, PET_CHANCE, PETS, SKILLS, TASKS } from "./data";
import { levelFromXp } from "./levels";
import { nextRandom } from "./rng";
import { GameState, ItemId, Report, SkillId } from "./types";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  /** Credits paid out the moment it is earned. */
  reward: number;
  done: (s: GameState) => boolean;
}

const levels = (s: GameState) => SKILLS.map((skill) => levelFromXp(s.xp[skill.id]));
const hunted = (s: GameState) => TASKS.filter((t) => t.monster && (s.stats.hunts[t.id] ?? 0) > 0).length;

/** Items the survivor has made or found at least once, or is holding. */
export const loggedItems = (s: GameState): ItemId[] =>
  (Object.keys(ITEMS) as ItemId[]).filter((id) => (s.stats.produced[id] ?? 0) > 0 || (s.inventory[id] ?? 0) > 0);

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_blood",
    name: "First Blood",
    description: "Defeat a creature.",
    reward: 100,
    done: (s) => s.stats.kills >= 1,
  },
  {
    id: "hunter",
    name: "Hunter",
    description: "Defeat 250 creatures.",
    reward: 2_000,
    done: (s) => s.stats.kills >= 250,
  },
  {
    id: "slayer",
    name: "Slayer",
    description: "Defeat 5,000 creatures.",
    reward: 25_000,
    done: (s) => s.stats.kills >= 5_000,
  },
  {
    id: "busy",
    name: "Busy Hands",
    description: "Finish 1,000 tasks.",
    reward: 1_000,
    done: (s) => s.stats.cycles >= 1_000,
  },
  {
    id: "workaholic",
    name: "Workaholic",
    description: "Finish 50,000 tasks.",
    reward: 30_000,
    done: (s) => s.stats.cycles >= 50_000,
  },
  {
    id: "apprentice",
    name: "Apprentice",
    description: "Reach level 10 in any skill.",
    reward: 200,
    done: (s) => Math.max(...levels(s)) >= 10,
  },
  {
    id: "journeyman",
    name: "Journeyman",
    description: "Reach level 10 in every skill.",
    reward: 5_000,
    done: (s) => Math.min(...levels(s)) >= 10,
  },
  {
    id: "expert",
    name: "Expert",
    description: "Reach level 50 in any skill.",
    reward: 10_000,
    done: (s) => Math.max(...levels(s)) >= 50,
  },
  {
    id: "master",
    name: "Master",
    description: "Reach level 99 in any skill.",
    reward: 100_000,
    done: (s) => Math.max(...levels(s)) >= 99,
  },
  {
    id: "contact",
    name: "Hello, Stranger",
    description: "Build the Signal Beacon.",
    reward: 300,
    done: (s) => (s.buildings.beacon ?? 0) > 0,
  },
  {
    id: "contractor",
    name: "Contractor",
    description: "Complete 10 bounties.",
    reward: 3_000,
    done: (s) => s.stats.bounties >= 10,
  },
  {
    id: "boss",
    name: "Bossbreaker",
    description: "Defeat a boss.",
    reward: 5_000,
    done: (s) => TASKS.some((t) => t.boss && (s.stats.hunts[t.id] ?? 0) > 0),
  },
  {
    id: "bestiary",
    name: "Bestiary",
    description: "Defeat every kind of creature.",
    reward: 50_000,
    done: (s) => hunted(s) >= TASKS.filter((t) => t.monster).length,
  },
  {
    id: "builder",
    name: "Settler",
    description: "Build every Base building at least once.",
    reward: 20_000,
    done: (s) => BUILDINGS.every((b) => (s.buildings[b.id] ?? 0) > 0),
  },
  {
    id: "collector",
    name: "Collector",
    description: "Log half of all items.",
    reward: 10_000,
    done: (s) => loggedItems(s).length * 2 >= Object.keys(ITEMS).length,
  },
  {
    id: "completionist",
    name: "Completionist",
    description: "Log every item.",
    reward: 100_000,
    done: (s) => loggedItems(s).length >= Object.keys(ITEMS).length,
  },
  { id: "pet", name: "Best Friend", description: "Find a pet.", reward: 2_000, done: (s) => s.pets.length > 0 },
  {
    id: "rescued",
    name: "Rescued",
    description: "Launch the Rescue Ship.",
    reward: 10_000,
    done: (s) => s.launches > 0,
  },
];

/**
 * Rolls for the skill's pet after a finished task. The roll comes from the save's start time and task
 * count rather than the game's random stream, so it never shifts what the fights and drops roll.
 */
export function rollPet(s: GameState, skill: SkillId, report: Report) {
  const pet = PETS[skill];
  if (!pet || s.pets.includes(skill)) return;
  const roll = {
    rng: s.createdAt ^ Math.imul(s.stats.cycles + 1, 0x9e3779b1) ^ SKILLS.findIndex((k) => k.id === skill),
  };
  if (nextRandom(roll) >= PET_CHANCE) return;
  s.pets.push(skill);
  report.notices.push(`★ A ${pet.name} has taken a liking to you`);
}

/** Pays out every achievement that has just been earned. */
export function checkAchievements(s: GameState, report: Report) {
  for (const a of ACHIEVEMENTS) {
    if (s.achievements.includes(a.id) || !a.done(s)) continue;
    s.achievements.push(a.id);
    s.credits += a.reward;
    report.notices.push(`Achievement: ${a.name} (+${a.reward.toLocaleString("en-US")} cr)`);
  }
}
