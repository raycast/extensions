import { useCallback, useEffect, useRef, useState } from "react";
import { OpenSymbol } from "./data";
import { cachedPreview, ensurePreview, Preview, Weight } from "./render";

/**
 * Renders previews for the symbols currently on screen and returns the ones
 * that are ready. Cached previews are picked up synchronously; missing ones
 * are fetched in the background and flushed into state in small batches.
 */
export function usePreviews(symbols: OpenSymbol[], weight: Weight | "strip") {
  const [ready, setReady] = useState<Map<string, Preview>>(() => new Map());
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const pending = useRef(new Map<string, Preview>());
  const timer = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const flush = () => {
      timer.current = undefined;
      if (cancelled || pending.current.size === 0) return;
      const batch = pending.current;
      pending.current = new Map();
      setReady((prev) => new Map([...prev, ...batch]));
    };

    const synchronous = new Map<string, Preview>();
    for (const s of symbols) {
      const id = `${weight}|${s.key}`;
      if (ready.has(id) || failed.has(id)) continue;
      const cached = cachedPreview(s, weight);
      if (cached) {
        synchronous.set(id, cached);
        continue;
      }
      ensurePreview(s, weight).then(
        (p) => {
          pending.current.set(id, p);
          if (!cancelled && !timer.current) timer.current = setTimeout(flush, 80);
        },
        () => {
          if (!cancelled) setFailed((prev) => new Set(prev).add(id));
        },
      );
    }
    if (synchronous.size) setReady((prev) => new Map([...prev, ...synchronous]));

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      timer.current = undefined;
    };
    // `ready`/`failed` are intentionally not dependencies: they only grow, and
    // re-running on every flush would re-check work already in flight.
  }, [symbols, weight]);

  const get = useCallback((s: OpenSymbol) => ready.get(`${weight}|${s.key}`), [ready, weight]);
  const hasFailed = useCallback((s: OpenSymbol) => failed.has(`${weight}|${s.key}`), [failed, weight]);
  return { get, hasFailed };
}
