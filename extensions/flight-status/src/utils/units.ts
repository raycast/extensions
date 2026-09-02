/**
 * Shared unit-conversion constants and helpers.
 *
 * Centralizes the conversion factors that were previously re-declared across
 * format.ts, eta.ts, flight-phase.ts, and the ADSB.lol client.
 */

/** Multiply meters by this to get feet. */
export const METERS_TO_FEET = 3.28084;

/** Multiply meters/second by this to get knots. */
export const MS_TO_KNOTS = 1.94384;

/** Multiply feet/minute by this to get meters/second. */
export const FT_PER_MIN_TO_MS = 1 / 196.85;

/** Convert feet to meters. */
export function feetToMeters(feet: number): number {
  return feet / METERS_TO_FEET;
}

/** Convert knots to meters/second. */
export function knotsToMs(knots: number): number {
  return knots / MS_TO_KNOTS;
}

/** Convert feet/minute to meters/second. */
export function ftPerMinToMs(ftPerMin: number): number {
  return ftPerMin * FT_PER_MIN_TO_MS;
}
