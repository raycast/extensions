import { randomInt } from "node:crypto";

// A whole number the API takes as a shuffle seed: the same seed gives the same
// order on every page, and a new one reshuffles. 0 to 2^31 - 1, evenly drawn.
export const newShuffleSeed = (): number => randomInt(0, 2_147_483_648);
