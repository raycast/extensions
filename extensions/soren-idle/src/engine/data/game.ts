/** Extra offline hours the Stasis Pod adds per level. */
export const OFFLINE_BONUS_HOURS = 4;

/** How long the locals take to answer once the Signal Beacon is built. */
export const CONTACT_DELAY_MS = 10 * 60 * 1000;

/** Offline progress is capped so a forgotten laptop does not trivialise the game. */
export const MAX_OFFLINE_MS = 12 * 60 * 60 * 1000;

/** Bump when the save shape changes, and add a step to `migrate.ts`. */
export const SAVE_VERSION = 3;
