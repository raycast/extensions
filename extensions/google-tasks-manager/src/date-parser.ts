import * as chrono from "chrono-node";

/**
 * Parses a natural language date string into a Date.
 *
 * Tries parsers in this order:
 *  1. English (casual — includes "today", "tomorrow", "next week")
 *  2. French  — "demain", "lundi prochain", "dans 3 jours"
 *  3. German  — "morgen", "nächste Woche", "in 3 Wochen"
 *  4. Spanish — "mañana", "el viernes", "en 3 días"
 *  5. Portuguese — "amanhã", "segunda-feira"
 *  6. Italian — "domani", "in 3 giorni", "prossimo lunedì"
 *
 * Returns null when no parser recognises the input.
 *
 * @param input   Raw text from the Due Date field.
 * @param refDate Reference point for relative dates (defaults to now; injectable for tests).
 */
export function parseNaturalDate(input: string, refDate: Date = new Date()): Date | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  return (
    chrono.casual.parseDate(trimmed, refDate) ??
    chrono.fr.parseDate(trimmed, refDate) ??
    chrono.de.parseDate(trimmed, refDate) ??
    chrono.es.parseDate(trimmed, refDate) ??
    chrono.pt.parseDate(trimmed, refDate) ??
    chrono.it.parseDate(trimmed, refDate) ??
    null
  );
}
