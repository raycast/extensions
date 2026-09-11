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

/** Disambiguates reservation tokens minted within the same millisecond. */
let reservationCounter = 0;

/**
 * The shared cooldown state. `provisional` marks a slot RESERVED for an in-flight
 * request (releasable by its owner via `token` if the request fails or the budget
 * turns out to remain); a non-provisional deadline is a CONFIRMED cooldown from a
 * spent budget / 429, which no one releases early.
 */
interface CooldownState {
  deadline: number;
  provisional: boolean;
  token: string;
}

function readState(): CooldownState {
  const raw = cache.get(CACHE_KEY);
  if (!raw) {
    return { deadline: 0, provisional: false, token: "" };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<CooldownState>;
    const deadline = Number(parsed.deadline);
    return {
      deadline: Number.isFinite(deadline) ? deadline : 0,
      provisional: parsed.provisional === true,
      token: typeof parsed.token === "string" ? parsed.token : "",
    };
  } catch {
    return { deadline: 0, provisional: false, token: "" };
  }
}

function writeState(state: CooldownState): void {
  cache.set(CACHE_KEY, JSON.stringify(state));
}

function readDeadline(): number {
  return readState().deadline;
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

  const commit = useCallback((state: CooldownState) => {
    writeState(state);
    setSecondsRemaining(secondsUntil(state.deadline));
  }, []);

  const startCooldown = useCallback(
    (seconds: number) => {
      // A CONFIRMED cooldown (from a 429). Never shorten an existing deadline — a
      // later response can report a smaller reset than one already in flight.
      const deadline = Math.max(readDeadline(), Date.now() + seconds * 1000);
      commit({ deadline, provisional: false, token: "" });
    },
    [commit],
  );

  // Reserve the single request slot BEFORE sending, so two commands can't both read
  // "clear" and both send. This is a best-effort claim: on this platform the cache
  // has no atomic compare-and-set, so two *exactly*-simultaneous callers could still
  // both win — but it closes the wide, common races (the ~1s poll window; any
  // non-instantaneous concurrency), leaving only a microsecond-wide residual.
  // Returns an owner token, or null if the slot was already held; the token lets the
  // caller release ITS OWN provisional hold (`releaseReservation`) without clobbering
  // a confirmed cooldown or another command's reservation.
  const reserveRequestSlot = useCallback((): string | null => {
    if (secondsUntil(readDeadline()) > 0) {
      return null; // already reserved or cooling down
    }
    const token = `${Date.now()}-${reservationCounter++}`;
    commit({ deadline: Date.now() + RESERVATION_MS, provisional: true, token });
    return token;
  }, [commit]);

  // Release a provisional reservation this command owns — used when its request
  // FAILED before reaching Reddit (network error), or SUCCEEDED with budget still
  // remaining, so the window shouldn't be held. Only clears the cache if it still
  // holds our own provisional token; a confirmed cooldown, or another command's
  // reservation, is left untouched.
  const releaseReservation = useCallback(
    (token: string) => {
      const state = readState();
      if (state.provisional && state.token === token) {
        commit({ deadline: 0, provisional: false, token: "" });
      }
    },
    [commit],
  );

  // Settle a reservation after its request completes. Budget SPENT or unknown →
  // promote the hold to a confirmed cooldown for the real reset window. Budget
  // REMAINED → release our reservation so an allowed follow-up isn't blocked.
  const settleAfterRequest = useCallback(
    (token: string, rateLimit?: RateLimit) => {
      const spent = !rateLimit || rateLimit.remaining === undefined || rateLimit.remaining < 1;
      if (!spent) {
        releaseReservation(token);
        return;
      }
      const reset = rateLimit?.reset ?? RESERVATION_MS / 1000;
      const deadline = Math.max(readDeadline(), Date.now() + reset * 1000);
      commit({ deadline, provisional: false, token: "" });
    },
    [commit, releaseReservation],
  );

  return { secondsRemaining, startCooldown, settleAfterRequest, releaseReservation, reserveRequestSlot, isCoolingDown };
}
