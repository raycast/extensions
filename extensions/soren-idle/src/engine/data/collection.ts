import { GameState, SkillId } from "../types";

/** Chance each finished task has of turning up its skill's pet. */
export const PET_CHANCE = 1 / 10_000;
/** What owning a pet adds to that skill's XP. */
export const PET_XP = 0.03;

/** One pet per skill that runs tasks. Each is a small XP bonus and a keepsake. */
export const PETS: Partial<Record<SkillId, { name: string; blurb: string }>> = {
  salvaging: { name: "Rust Mite", blurb: "Follows you around the wreck, nibbling at anything loose." },
  mining: { name: "Geode Beetle", blurb: "Sleeps in your pocket and hums when ore is close." },
  foraging: { name: "Sprout Sprite", blurb: "Sniffs out the safe berries first." },
  cooking: { name: "Ember Newt", blurb: "Keeps your stove warm and your soup hot." },
  engineering: { name: "Cog Gecko", blurb: "Tightens bolts when you are not looking." },
  fabrication: { name: "Spark Finch", blurb: "Perches on the forge and sings in sparks." },
  combat: { name: "Shell Pup", blurb: "A tiny armored pup that growls at everything." },
  xenochemistry: { name: "Vial Slime", blurb: "Changes color with whatever you are brewing." },
  xenofishing: { name: "Lure Fish", blurb: "Swims along the line and steals the bait." },
  smelting: { name: "Slag Imp", blurb: "Laughs every time the furnace roars." },
  hacking: { name: "Glitch Moth", blurb: "Drawn to any screen that is about to crash." },
  exploration: { name: "Trail Hare", blurb: "Always one hill ahead of you." },
  companions: { name: "Plush Drone", blurb: "A drone that thinks it is a pet." },
  stargazing: { name: "Comet Cub", blurb: "Leaves a faint glitter wherever it sleeps." },
};

export const petBonus = (s: GameState, skill: SkillId) => (s.pets.includes(skill) ? 1 + PET_XP : 1);
