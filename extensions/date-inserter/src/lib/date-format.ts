import { format, Locale } from "date-fns";

export type FormatResult = { ok: true; value: string } | { ok: false; error: string };

/**
 * Formats with a user-supplied date-fns pattern. Patterns come from the
 * preferences, so invalid ones (e.g. unescaped letters) are reported instead
 * of throwing.
 */
export function formatDate(date: Date, pattern: string, locale: Locale): FormatResult {
  try {
    return { ok: true, value: format(date, pattern, { locale }) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
