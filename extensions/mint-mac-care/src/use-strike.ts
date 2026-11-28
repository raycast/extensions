import { readFileSync } from "node:fs";
import { useCallback, useEffect, useRef, useState } from "react";
import { progressFile } from "./use-progress";

/** How long a struck row stays in place before it folds away, as in the app's drawer. */
export const FOLD_DELAY_MS = 420;

export type Strike = {
  /** Done: drawn with a line through it, still in its place. */
  struck: ReadonlySet<string>;
  /** Folded away: no longer listed. */
  gone: ReadonlySet<string>;
  /** A run is going on, or its rows are still being struck. */
  active: boolean;
  /** A run starts: `total` rows, `token` the progress file Mint writes for it. */
  begin: (total: number, token?: string) => void;
  /** The run has answered: strike every row in `done` not struck yet, then call `onSettled`. */
  end: (done: string[], onSettled?: () => void) => void;
  /** Start over (a new scan). */
  reset: () => void;
};

/**
 * Rows leave one by one: each is struck, then folds away 0.42 s later, the
 * way the app's drawer removes what it cleans (2026-09-25). Mint 1.0.81
 * names each item as it finishes (`settled` in the request's progress file),
 * so rows go while the run goes on; an older Mint answers only at the end,
 * and the rows it removed are struck then, at the same pace.
 */
export function useStrike(): Strike {
  const [struck, setStruck] = useState<ReadonlySet<string>>(new Set());
  const [gone, setGone] = useState<ReadonlySet<string>>(new Set());
  const [active, setActive] = useState(false);
  const queue = useRef<string[]>([]);
  const seen = useRef(new Set<string>());
  const pace = useRef(120);
  const ticker = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const poller = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const folds = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const ended = useRef(false);
  const settled = useRef<(() => void) | undefined>(undefined);

  const stopTimers = () => {
    if (ticker.current) clearInterval(ticker.current);
    if (poller.current) clearInterval(poller.current);
    for (const fold of folds.current) clearTimeout(fold);
    ticker.current = undefined;
    poller.current = undefined;
    folds.current = [];
  };
  useEffect(() => stopTimers, []);

  const finishIfDrained = () => {
    if (!ended.current || queue.current.length > 0 || ticker.current) return;
    const done = settled.current;
    settled.current = undefined;
    const last = setTimeout(() => {
      setActive(false);
      done?.();
    }, FOLD_DELAY_MS + 60);
    folds.current.push(last);
  };

  const tick = () => {
    const id = queue.current.shift();
    if (id === undefined) {
      if (ticker.current) clearInterval(ticker.current);
      ticker.current = undefined;
      finishIfDrained();
      return;
    }
    setStruck((current) => new Set(current).add(id));
    folds.current.push(setTimeout(() => setGone((current) => new Set(current).add(id)), FOLD_DELAY_MS));
  };

  const enqueue = (ids: string[]) => {
    for (const id of ids) {
      if (seen.current.has(id)) continue;
      seen.current.add(id);
      queue.current.push(id);
    }
    if (queue.current.length && !ticker.current) ticker.current = setInterval(tick, pace.current);
  };

  const begin = useCallback((total: number, token?: string) => {
    ended.current = false;
    settled.current = undefined;
    setActive(true);
    // Two seconds for the whole list, never faster than the eye can follow.
    pace.current = Math.round(Math.min(180, Math.max(50, 2000 / Math.max(1, total))));
    if (poller.current) clearInterval(poller.current);
    if (!token) return;
    poller.current = setInterval(() => {
      try {
        const value = JSON.parse(readFileSync(progressFile(token), "utf8")) as { settled?: unknown };
        if (Array.isArray(value.settled)) enqueue(value.settled.filter((id): id is string => typeof id === "string"));
      } catch {
        // Not written yet, already removed, or a Mint that does not name items.
      }
    }, 150);
  }, []);

  const end = useCallback((done: string[], onSettled?: () => void) => {
    if (poller.current) clearInterval(poller.current);
    poller.current = undefined;
    ended.current = true;
    settled.current = onSettled;
    enqueue(done);
    finishIfDrained();
  }, []);

  const reset = useCallback(() => {
    stopTimers();
    queue.current = [];
    seen.current = new Set();
    ended.current = false;
    settled.current = undefined;
    setStruck(new Set());
    setGone(new Set());
    setActive(false);
  }, []);

  return { struck, gone, active, begin, end, reset };
}
