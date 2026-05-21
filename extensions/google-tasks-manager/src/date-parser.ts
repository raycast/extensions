import * as chrono from "chrono-node";

/**
 * Parses a natural language date string into a Date.
 * Tries English (with casual aliases like "today", "tomorrow") first,
 * then French ("demain", "dans 3 jours", "la semaine prochaine").
 * Returns null if the input cannot be parsed.
 */
export function parseNaturalDate(input: string): Date | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const now = new Date();

  const enResult = chrono.casual.parseDate(trimmed, now);
  if (enResult) return enResult;

  const frResult = chrono.fr.parseDate(trimmed, now);
  if (frResult) return frResult;

  return null;
}
