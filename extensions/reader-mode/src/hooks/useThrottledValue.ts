import { useEffect, useRef, useState } from "react";

/**
 * Returns `value`, updated at most once per `intervalMs`; the latest value always lands when the
 * interval elapses. An interval of 0 passes `value` straight through.
 *
 * Used for the streamed summary: every streamed token otherwise re-sends the whole article
 * markdown to Raycast, and on a long article that exhausts the 100 MB extension heap.
 */
export function useThrottledValue<T>(value: T, intervalMs: number): T {
  const [shown, setShown] = useState(value);
  const lastUpdate = useRef(0);

  useEffect(() => {
    if (intervalMs <= 0) return;
    const show = () => {
      lastUpdate.current = performance.now();
      setShown(value);
    };
    const wait = lastUpdate.current + intervalMs - performance.now();
    if (wait <= 0) {
      show();
      return;
    }
    const timer = setTimeout(show, wait);
    return () => clearTimeout(timer);
  }, [value, intervalMs]);

  return intervalMs <= 0 ? value : shown;
}
