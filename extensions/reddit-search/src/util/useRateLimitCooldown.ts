import { useCallback, useEffect, useState } from "react";
import { useCachedState } from "@raycast/utils";
import { RateLimit } from "../RedditApi/Api";

/**
 * Tracks a countdown to the moment Reddit will accept another request.
 *
 * Reddit's Atom feed allows roughly one request per minute **per IP** and answers
 * an exhausted budget with an *empty-bodied* 429 — which would otherwise render
 * as "no results" rather than as a rate limit.
 *
 * The deadline is stored with `useCachedState` rather than in module scope
 * because each Raycast command runs as its **own process**: a module-level
 * variable is per-command memory, so "Search Reddit" hitting the limit left
 * "Search Subreddits" believing it still had budget. The Raycast cache is shared
 * across commands, which is the only level that matches an IP-wide limit.
 */
const CACHE_KEY = "redditRateLimitDeadline";

function secondsUntil(deadline: number): number {
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

export default function useRateLimitCooldown() {
  const [deadline, setDeadline] = useCachedState<number>(CACHE_KEY, 0);
  const [secondsRemaining, setSecondsRemaining] = useState(() => secondsUntil(deadline));

  // Re-derive whenever the shared deadline changes (including when another
  // command wrote to it while this list was open).
  useEffect(() => {
    setSecondsRemaining(secondsUntil(deadline));
  }, [deadline]);

  const isCoolingDown = secondsRemaining > 0;

  useEffect(() => {
    if (!isCoolingDown) {
      return;
    }

    const timer = setInterval(() => setSecondsRemaining(secondsUntil(deadline)), 1000);
    return () => clearInterval(timer);
  }, [isCoolingDown, deadline]);

  const startCooldown = useCallback(
    (seconds: number) => {
      // Never shorten an existing cooldown: a later response can report a smaller
      // reset than one already in flight, and trusting it would re-enable the UI
      // while Reddit is still refusing requests.
      setDeadline((previous) => Math.max(previous ?? 0, Date.now() + seconds * 1000));
    },
    [setDeadline],
  );

  // Arm the cooldown when a successful response has spent the budget. Reddit reports
  // the remaining count on every response, so this is how the guard engages *before*
  // the next request 429s rather than after.
  const armIfSpent = useCallback(
    (rateLimit?: RateLimit) => {
      if (rateLimit && rateLimit.remaining < 1) {
        startCooldown(rateLimit.reset);
      }
    },
    [startCooldown],
  );

  return { secondsRemaining, startCooldown, armIfSpent, isCoolingDown };
}
