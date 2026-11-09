import { ShopEntry } from "../types";

export const BOUNTY_SHOP: ShopEntry[] = [
  { item: "stim_pack", cost: 8, levelReq: 2 },
  { item: "prospector_charm", cost: 400, levelReq: 3 },
  { item: "sorenian_lance", cost: 600, levelReq: 4 },
  { item: "sorenian_warplate", cost: 900, levelReq: 5 },
];

/** Bounty level needed before the board offers a tier (index 0 is tier 1). */
export const TIER_LEVELS = [1, 2, 4];

/** How often the unclaimed bounties on the board are replaced. */
export const BOARD_REFRESH_MS = 60 * 60 * 1000;

/** Marks per kill by bounty tier, and the extra the board pays per level (index 0 is level 1). */
export const MARKS_PER_KILL = [1, 2, 4];

export const BOARD_BONUS = [0, 0.15, 0.3];

export const REROLL_COST = 10;

export const ABANDON_COST = 5;

/** Locals who post bounties. */
export const POSTERS = [
  "Oru the herder",
  "Tessik of the lower terraces",
  "Marah Veln",
  "Old Dovu",
  "Kesh, a grain-warden",
  "Ilun the courier",
  "Sorrel of the ferry",
  "Brann Teyo",
];

/** Flavour for a request. `{m}` is the creature's name. */
export const BOUNTY_LINES = [
  "A {m} has been seen at the edge of the fields. We cannot sleep.",
  "The {m} keep coming back. Please. Thin them out.",
  "My brother went after a {m} alone. He is fine. His boots are not.",
  "Everything quiet has gone quiet. It is the {m}. It is always the {m}.",
  "We will pay what we can. The {m} must not reach the water.",
  "You fight well, sky-friend. Would you fight a {m} for us?",
];
