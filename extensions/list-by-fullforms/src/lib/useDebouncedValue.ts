// Generic debounced-value hook: returns a copy of `value` that only
// updates after `delayMs` has passed with no further changes. Quick Add
// Entry uses it to throttle the duplicate-check fetch so it doesn't fire
// one round-trip per keystroke; each debounced field is an independent
// instance so editing one doesn't reset the other's timer.
//
// The debounced value initializes to the current `value` (not empty), so
// a form pre-seeded with a term (the Search command's "add this as a new
// entry" push) checks for duplicates on first paint rather than after an
// idle delay.

import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
