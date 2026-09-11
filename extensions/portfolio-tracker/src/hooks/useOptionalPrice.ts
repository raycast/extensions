/**
 * Parses an optional price-like form input into a positive number.
 *
 * Used by forms that let the user optionally enter a price (buy price,
 * price paid, price override) which, when present, should override a
 * default price (live quote, current price) used elsewhere in the form —
 * e.g. as the divisor for a "total value invested" calculation.
 *
 * @param input - Raw string from a Form.TextField
 * @returns The parsed positive number, or null when empty, non-numeric, or ≤ 0
 */

import { useMemo } from "react";

export function useOptionalPrice(input: string): number | null {
  return useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return !isNaN(parsed) && parsed > 0 ? parsed : null;
  }, [input]);
}
