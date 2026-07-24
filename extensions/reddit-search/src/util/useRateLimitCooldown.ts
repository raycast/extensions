import { useCallback, useEffect, useState } from "react";
import { Cache } from "@raycast/api";
import { RateLimit } from "../RedditApi/Api";

/**
 * Tracks a countdown to the moment Reddit will accept another request.
 *
 * Reddit's Atom feed allows roughly one request per minute **per IP** and answers
 * an exhausted budget with an *empty-bodied* 429 — which would otherwise render
 * as "no results" rather than as a rate limit.
 *
 * The deadline lives in the Raycast `Cache` (shared across commands on disk), not
 * in module scope: each Raycast command runs as its **own process**, so a
 * module-level variable is per-command memory. But the cache's own change
 * notifications are also per-process — a write in "Search Reddit" does NOT wake a
 * "Search Subreddits" instance that was already open. So this hook does not trust
 * a cached React value across processes: it **re-reads the cache on a 1s poll**,
 * which is what lets an already-open command pick up another command's cooldown
 * (the cross-process case a subscription/`useCachedState` would miss).
 */
const CACHE_KEY = "redditRateLimitDeadline";
const cache = new Cache({ namespace: "rate-limit" });

function readDeadline(): number {
  const raw = cache.get(CACHE_KEY);
  const value = raw ? Number(raw) : 0;
  return Number.isFinite(value) ? value : 0;
}

function writeDeadline(deadline: number): void {
  cache.set(CACHE_KEY, String(deadline));
}

function secondsUntil(deadline: number): number {
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

export default function useRateLimitCooldown() {
  const [secondsRemaining, setSecondsRemaining] = useState(() => secondsUntil(readDeadline()));

  // Poll the shared cache every second. This ticks the countdown down AND detects a
  // deadline written by ANOTHER command's process (which has no in-process signal to
  // this instance). Always polling — not only while cooling down — is what closes the
  // gap where a second, already-open command never learns a cooldown started.
  useEffect(() => {
    const tick = () => setSecondsRemaining(secondsUntil(readDeadline()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  // `isCoolingDown` is the POLLED value — correct for display, but up to ~1s stale
  // relative to another command's write. Do NOT gate an actual request on it.
  const isCoolingDown = secondsRemaining > 0;

  // The authoritative gate: reads the shared deadline SYNCHRONOUSLY at call time, so
  // there is no polling window for a concurrent command to slip a request through
  // during an active cooldown. Callers must decide whether to send a network request
  // with this, not with `isCoolingDown`.
  const isCoolingDownNow = useCallback(() => secondsUntil(readDeadline()) > 0, []);

  const startCooldown = useCallback((seconds: number) => {
    // Never shorten an existing cooldown: a later response can report a smaller
    // reset than one already in flight, and trusting it would re-enable the UI
    // while Reddit is still refusing requests. Read-modify-write against the shared
    // cache so concurrent commands compose rather than clobber.
    const next = Math.max(readDeadline(), Date.now() + seconds * 1000);
    writeDeadline(next);
    setSecondsRemaining(secondsUntil(next));
  }, []);

  // Arm the cooldown when a successful response has spent the budget, so the guard
  // engages *before* the next request 429s rather than after. An UNKNOWN budget
  // (`remaining === undefined`, i.e. Reddit omitted the header) counts as spent:
  // at ~1 request/minute a completed request has likely used the window, and
  // holding is the safe default (cached searches still work during cooldown).
  const armIfSpent = useCallback(
    (rateLimit?: RateLimit) => {
      if (rateLimit && (rateLimit.remaining === undefined || rateLimit.remaining < 1)) {
        startCooldown(rateLimit.reset);
      }
    },
    [startCooldown],
  );

  return { secondsRemaining, startCooldown, armIfSpent, isCoolingDown, isCoolingDownNow };
}
