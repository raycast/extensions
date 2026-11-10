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
    blurb: "Build the parts and machines everything else runs on, and the Workshop that speeds them up.",
  },
  {
    id: "fabrication",
    name: "Fabrication",
    blurb: "Shape plates, springs and lenses, then fit them into tools, weapons and armor.",
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
    blurb: "Brew local compounds into potions that speed you up, fatten your hauls or sharpen your blows.",
  },
  {
    id: "xenofishing",
    name: "Xenofishing",
    blurb: "Cast a line into the alien lakes. Cook what bites, if it will hold still.",
  },
  {
    id: "smelting",
    name: "Smelting",
    blurb: "Melt ore, crystal and shell into ingots that sell far better than the raw stuff.",
  },
  {
    id: "hacking",
    name: "Hacking",
    blurb: "Talk the ancient vaults into opening up. Their loot is old and very valuable.",
  },
  {
    id: "exploration",
    name: "Exploration",
    blurb: "Chart the wilds. Every level makes Salvaging, Mining, Foraging and Xenofishing 0.4% faster.",
  },
  {
    id: "companions",
    name: "Companions",
    blurb: "Build small machine friends that ride along and lend a hand, in a fight or on a haul.",
  },
  {
    id: "stargazing",
    name: "Stargazing",
    blurb: "Watch the alien sky. Chart a constellation and it changes you for good.",
  },
];

export const SKILL_BY_ID: Record<SkillId, SkillDef> = Object.fromEntries(SKILLS.map((s) => [s.id, s])) as Record<
  SkillId,
  SkillDef
>;

export const MAX_LEVEL = 99;
