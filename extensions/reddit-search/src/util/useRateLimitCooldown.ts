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

/**
 * How long a provisional request reservation holds the shared slot while a request
 * is in flight. Matches the ~1 request/minute window: if the response never lands
 * (crash, killed command), the reservation self-expires rather than wedging the
 * cooldown forever, and it's the same length a spent-budget response would set.
 */
const RESERVATION_MS = 60_000;

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
  // relative to another command's write. Do NOT gate an actual request on it; use
  // `reserveRequestSlot` for that.
  const isCoolingDown = secondsRemaining > 0;

  const startCooldown = useCallback((seconds: number) => {
    // Never shorten an existing cooldown: a later response can report a smaller
    // reset than one already in flight, and trusting it would re-enable the UI
    // while Reddit is still refusing requests. Read-modify-write against the shared
    // cache so concurrent commands compose rather than clobber.
    const next = Math.max(readDeadline(), Date.now() + seconds * 1000);
    writeDeadline(next);
    setSecondsRemaining(secondsUntil(next));
  }, []);

  // Reserve the single request slot BEFORE sending, closing the last race: merely
  // *checking* the deadline lets two commands both read "clear" and both send, each
  // arming the cooldown only after its response — so one still 429s. Reservation is
  // check-and-write in one step: if the window is clear, immediately claim it by
  // writing a provisional cooldown, so a concurrent caller a moment later reads the
  // claim and is refused. The reservation is then settled by `settleAfterRequest`
  // (called with the response's rate-limit budget), which fixes the deadline to the
  // real reset window.
  const reserveRequestSlot = useCallback((): boolean => {
    if (secondsUntil(readDeadline()) > 0) {
      return false; // already reserved or cooling down
    }
    const next = Date.now() + RESERVATION_MS;
    writeDeadline(next);
    setSecondsRemaining(secondsUntil(next));
    return true;
  }, []);

  // After a reserved request completes, settle the shared deadline to the real reset
  // window Reddit reported (extending, never shortening, an existing cooldown). A
  // spent/unknown budget and a still-present budget both resolve here: the provisional
  // reservation simply *becomes* the actual cooldown. We deliberately do NOT release
  // the reservation early on "budget remained" — at ~1 request/minute the very next
  // request should wait regardless, so holding the window is correct, and it avoids a
  // fragile "is this deadline mine or a real cooldown?" check that could clear another
  // command's hold. `reset` defaults to the reservation window when Reddit omits it.
  const settleAfterRequest = useCallback((rateLimit?: RateLimit) => {
    const reset = rateLimit?.reset ?? RESERVATION_MS / 1000;
    const next = Math.max(readDeadline(), Date.now() + reset * 1000);
    writeDeadline(next);
    setSecondsRemaining(secondsUntil(next));
  }, []);

  return { secondsRemaining, startCooldown, settleAfterRequest, reserveRequestSlot, isCoolingDown };
}
