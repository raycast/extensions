import { useEffect, useState } from "react";

/**
 * Hold a value still until it stops changing.
 *
 * The search list fetches an entry for whatever row is selected, and holding the
 * arrow key down moves the selection faster than Wiktionary can answer. Without
 * this every row passed through on the way to the one you wanted costs a request.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
}
