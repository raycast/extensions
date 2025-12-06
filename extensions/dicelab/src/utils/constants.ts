// Constants ported from web/src/config/constants.js

export interface Example {
  title: string;
  code: string;
}

// Example dice expressions
export const EXAMPLES: Example[] = [
  // Basic rolls
  { title: "Single d20 roll", code: "d20" },
  { title: "Percentile roll (d100)", code: "d100" },
  { title: "Advantage on a d20 (adv)", code: "d20adv" },
  { title: "Disadvantage on a d20 (dis)", code: "d20dis" },

  // Filters and character creation
  { title: "Ability score roll (4d6 drop lowest 1, dl)", code: "4d6dl1" },
  { title: "Character creation (roll 6 ability scores)", code: "(4d6dl1)^6" },
  {
    title: "Reroll 1s and 2s on damage (rr = infinite rerolls)",
    code: "2d6rr1 rr2 + 3",
  },
  { title: "Reroll 1s once on each die (ro = reroll once)", code: "4d6ro1" },
  { title: "Spell damage example (Fireball 8d6)", code: "8d6" },

  // DC checks and saves
  {
    title: "Skill check vs DC 15 (comparison returns 0 or 1)",
    code: "(d20 + 6) >= 15",
  },
  {
    title: "Spell save: full damage on fail, half on success",
    code: "(d20 + 2) >= 15 ? 8d6 / 2 : 8d6",
  },

  // Attacks vs AC with crit support (all use ternary)
  {
    title: "Basic attack vs AC 15 (2d6+4 on hit)",
    code: "(d20 attack + 6) >= 15 ? 2d6 + 4 : 0",
  },
  {
    title: "Attack with advantage vs AC 15 (2d6+4 on hit)",
    code: "(d20adv attack + 6) >= 15 ? 2d6 + 4 : 0",
  },
  {
    title: "Attack with extended crit range (19-20) and advantage",
    code: "(d20adv attack crit19..20 + 6) >= 15 ? 2d6 + 4 : 0",
  },
  {
    title: "Attack vs AC 15, crit doubles all dice (oncrit double_all)",
    code: "(d20 attack + 6 oncrit double_all) >= 15 ? 2d6 + 4 : 0",
  },
  {
    title:
      "Attack vs AC 15, crit maximizes bonus dice (oncrit max_second_dice)",
    code: "(d20 attack + 6 oncrit max_second_dice) >= 15 ? 2d6 + 4 : 0",
  },
  {
    title: "Elven Accuracy: triple advantage vs AC (keep highest)",
    code: "(3d20kh1 attack + 7) >= 17 ? 1d8 + 4 : 0",
  },
  {
    title: "Multiattack: repeat the whole attack expression 3 times",
    code: "((d20 attack + 5) >= 15 ? 1d8 + 4 : 0)^3",
  },

  // Analysis
  {
    title: "Analyze a single expression (3d6 distribution)",
    code: "analyze 3d6",
  },
  {
    title: "Analyze advantage vs normal attack bonus",
    code: "analyze 2d20kh1 + 5, d20 + 5",
  },
  {
    title:
      "Analysis of A paladin under effects of bless with 2 attacks, with +8 to hit, against an AC of 15, holding a d10 weapon with +5 damage modifier and doing divine smite on crits",
    code: "analyze (d20adv attack crit19..20 + 8 as a1 + d4 > 15 ? (1d10 + 5 + (a1.crit ? 2d8))) + (d20adv attack crit19..20 + 8 as a2 + d4 > 15 ? (1d10 + 5 + (a1.crit == 0 ? (a2.crit ? 2d8))))",
  },
];

export const CONTEXT_STORAGE_KEY = "raycast-dicelab";
