/** Human-readable label for each Habitica priority value. */
export const PRIORITY_LABELS: Record<number, string> = {
  0.1: "Trivial",
  1: "Easy",
  1.5: "Medium",
  2: "Hard",
};

/** Dropdown options shared by the create-task and edit-task forms. */
export const PRIORITY_OPTIONS: { value: string; title: string }[] = [
  { value: "0.1", title: "Trivial" },
  { value: "1", title: "Easy" },
  { value: "1.5", title: "Medium" },
  { value: "2", title: "Hard" },
];

/** Sentinel value for the "no tag filter" dropdown option. */
export const TAG_FILTER_ALL = "all";

/** Shared S3 asset base URL used by avatar and inventory. */
export const ASSET_BASE_URL = "https://habitica-assets.s3.amazonaws.com/mobileApp/images/";

/** Skill definitions per class, sourced from habitica/website/common/script/content/spells.js. */
export interface SkillDefinition {
  key: string;
  name: string;
  description: string;
  mana: number;
  level: number;
  /** When true, the skill expects a task targetId. */
  targetsTask?: boolean;
  /** When true, the skill expects a party member targetId. */
  targetsParty?: boolean;
}

export const SKILLS_BY_CLASS: Record<string, SkillDefinition[]> = {
  warrior: [
    {
      key: "smash",
      name: "Brutal Smash",
      description: "Deals damage to a task & boss.",
      mana: 10,
      level: 11,
      targetsTask: true,
    },
    { key: "defensiveStance", name: "Defensive Stance", description: "Reduces incoming damage.", mana: 25, level: 12 },
    {
      key: "valorousPresence",
      name: "Valorous Presence",
      description: "Boosts STR for the party.",
      mana: 20,
      level: 13,
    },
    { key: "intimidate", name: "Intimidating Gaze", description: "Boosts CON for the party.", mana: 15, level: 14 },
  ],
  wizard: [
    {
      key: "fireball",
      name: "Burst of Flames",
      description: "Deals damage to a task & boss.",
      mana: 10,
      level: 11,
      targetsTask: true,
    },
    { key: "mpheal", name: "Ethereal Surge", description: "Restores mana for the party.", mana: 30, level: 12 },
    { key: "earth", name: "Earthquake", description: "Boosts INT for the party.", mana: 35, level: 13 },
    { key: "frost", name: "Chilling Frost", description: "Removes daily streaks for re-rolling.", mana: 40, level: 14 },
  ],
  rogue: [
    { key: "pickPocket", name: "Pickpocket", description: "Steals gold.", mana: 10, level: 11, targetsTask: true },
    {
      key: "backStab",
      name: "Backstab",
      description: "Deals damage & gives EXP.",
      mana: 15,
      level: 12,
      targetsTask: true,
    },
    { key: "toolsOfTrade", name: "Tools of the Trade", description: "Boosts PER for the party.", mana: 25, level: 13 },
    { key: "stealth", name: "Stealth", description: "Avoid Daily damage tonight.", mana: 45, level: 14 },
  ],
  healer: [
    { key: "heal", name: "Healing Light", description: "Restores health.", mana: 15, level: 11 },
    { key: "brightness", name: "Searing Brightness", description: "Boosts task values.", mana: 15, level: 12 },
    { key: "protectAura", name: "Protective Aura", description: "Boosts CON for the party.", mana: 30, level: 13 },
    { key: "healAll", name: "Blessing", description: "Restores health for the party.", mana: 25, level: 14 },
  ],
};

export const STAT_LABELS: Record<string, string> = {
  str: "Strength",
  con: "Constitution",
  int: "Intelligence",
  per: "Perception",
};

export const ATTRIBUTE_OPTIONS: { value: string; title: string }[] = [
  { value: "str", title: "Strength" },
  { value: "int", title: "Intelligence" },
  { value: "per", title: "Perception" },
  { value: "con", title: "Constitution" },
];
