import { useCallback, useEffect, useRef, useState } from "react";
import { OpenSymbol } from "./data";
import {
  cachedPreview,
  ensurePreview,
  Preview,
  PreviewCancelled,
  previewId,
  releasePreviews,
  retainPreviews,
  Weight,
} from "./render";

/**
 * Renders previews for the symbols currently on screen and returns the ones
 * that are ready. Cached previews are picked up synchronously; missing ones
 * are fetched in the background and flushed into state in small batches.
 *
 * Keys include the Open Symbols release, so after a symbol update every
 * preview is looked up again rather than reusing paths from the old release.
 * Symbols that leave the screen are released, which drops their queued work.
 */
export function usePreviews(symbols: OpenSymbol[], weight: Weight | "strip") {
  const [ready, setReady] = useState<Map<string, Preview>>(() => new Map());
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const [attempt, setAttempt] = useState(0);
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
    const requested: string[] = [];
    for (const s of symbols) {
      const id = previewId(s, weight);
      if (ready.has(id) || failed.has(id)) continue;
      const cached = cachedPreview(s, weight);
      if (cached) {
        synchronous.set(id, cached);
        continue;
      }
      requested.push(id);
    }
    retainPreviews(requested);
    for (const s of symbols) {
      const id = previewId(s, weight);
      if (!requested.includes(id)) continue;
      const request = (retriesLeft: number) =>
        ensurePreview(s, weight).then(
          (p) => {
            pending.current.set(id, p);
            if (!cancelled && !timer.current) timer.current = setTimeout(flush, 80);
          },
          (e) => {
            if (cancelled) return;
            // Still on screen but handed a cancelled job: ask again rather than spin forever.
            if (e instanceof PreviewCancelled) {
              if (retriesLeft > 0) void request(retriesLeft - 1);
              return;
            }
            setFailed((prev) => new Set(prev).add(id));
          },
        );
      void request(2);
    }
    if (synchronous.size) setReady((prev) => new Map([...prev, ...synchronous]));

    return () => {
      cancelled = true;
      releasePreviews(requested);
      if (timer.current) clearTimeout(timer.current);
      timer.current = undefined;
    };
    // `ready`/`failed` are intentionally not dependencies: they only grow, and
    // re-running on every flush would re-check work already in flight.
    // `attempt` re-runs the effect after a retry.
  }, [symbols, weight, attempt]);

  const get = useCallback((s: OpenSymbol) => ready.get(previewId(s, weight)), [ready, weight]);
  const hasFailed = useCallback((s: OpenSymbol) => failed.has(previewId(s, weight)), [failed, weight]);
  /** Clears failures so those previews are tried again. */
  const retry = useCallback(() => {
    setFailed(new Set());
    setAttempt((n) => n + 1);
  }, []);
  return { get, hasFailed, retry, failedCount: failed.size };
}
