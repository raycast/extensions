import { useEffect, useState } from "react";

/**
 * Parses a comma-separated string of property names into a trimmed, non-empty array.
 * e.g. "Status, Owner,  Due Date" → ["Status", "Owner", "Due Date"]
 */
export function parsePropertyList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Returns a debounced version of `value` that only updates after
 * `delayMs` milliseconds have passed without a new value being set.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
