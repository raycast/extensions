import turn2Lookup from "../data/turn2-lookup.json";

export const STARTER = "salet";

export const PRIOR_THRESHOLD = 3000;
export const PRIOR_STEEPNESS = 10;
export const ENDGAME_CANDIDATE_LIMIT = 8;
export const ENTROPY_ANSWER_PROBABILITY_BONUS = 1;

export const TURN2_LOOKUP: Readonly<Record<string, string>> = turn2Lookup as Record<string, string>;

export const STORAGE_KEY = "wordle-game";
