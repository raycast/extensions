import { SkillDef, SkillId } from "../types";

export const SKILLS: SkillDef[] = [
  {
    id: "salvaging",
    name: "Salvaging",
    blurb: "Pick the wreck of your ship apart for metal and electronics.",
  },
  { id: "mining", name: "Mining", blurb: "Crack open the alien rock for ore and crystals." },
  {
    id: "foraging",
    name: "Foraging",
    blurb: "Find out which local plants are food and which are lethal.",
  },
  {
    id: "cooking",
    name: "Cooking",
    blurb: "Turn whatever you foraged into something you can keep down.",
  },
  {
    id: "engineering",
    name: "Engineering",
    blurb: "Turn raw materials into tools and gear.",
  },
  {
    id: "combat",
    name: "Combat",
    blurb: "The wildlife disagrees with your presence. Disagree back.",
  },
  {
    id: "hydroponics",
    name: "Hydroponics",
    blurb: "Plant, wait, harvest. The crops grow whether or not you are watching.",
  },
  {
    id: "xenochemistry",
    name: "Xenochemistry",
    blurb:
      "Brew local compounds into potions that speed you up, fatten your hauls or sharpen your blows.",
  },
];

export const SKILL_BY_ID: Record<SkillId, SkillDef> = Object.fromEntries(
  SKILLS.map((s) => [s.id, s]),
) as Record<SkillId, SkillDef>;

export const MAX_LEVEL = 99;
