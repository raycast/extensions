import { type Card, type ScryfallSearchResponse } from "./shared";

// ─── Module-level Cover Fetcher ───────────────────────────────────────────────
//
// Runs completely outside React's lifecycle. Callbacks are stored as mutable
// module-level references so React remounts (Strict Mode) never result in the
// loop calling a stale/dead state setter — it always calls the latest one.

const FETCH_DELAY_MS = 250; // Stay well within Scryfall's 10 req/sec guideline

type OnCard = (code: string, card: Card) => void;
type OnDone = (accumulated: Record<string, Card>) => void;

// Mutable references updated by the component on every render
let currentOnCard: OnCard = () => {};
let currentOnDone: OnDone = () => {};

const fetchedCodes = new Set<string>();
let cancelCurrent: (() => void) | null = null;
let paused = false;

// Returns the card, or throws with a retryAfterMs property if rate limited
async function fetchMostExpensiveCard(code: string): Promise<Card | undefined> {
  const res = await fetch(
    `https://api.scryfall.com/cards/search?q=e:${encodeURIComponent(code)}&order=usd&dir=desc&unique=prints`
  );
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("Retry-After") ?? "1", 10);
    const err = Object.assign(new Error("rate_limited"), { retryAfterMs: retryAfter * 1000 });
    throw err;
  }
  if (!res.ok) return undefined;
  const json = (await res.json()) as ScryfallSearchResponse;
  return json.data[0];
}

/**
 * Register the latest callbacks. Call this on every render so the loop always
 * uses the live component's state setters, even after a Strict Mode remount.
 */
export function updateCoverCallbacks(onCard: OnCard, onDone: OnDone): void {
  currentOnCard = onCard;
  currentOnDone = onDone;
}

/**
 * Start background-fetching covers for the given set codes.
 * Cancels any currently-running loop first so filter switches are instant.
 * Already-fetched codes are skipped.
 */
export function startCoverFetch(codes: string[], cached: Set<string>): void {
  // Cancel whatever is currently running
  if (cancelCurrent) {
    cancelCurrent();
    cancelCurrent = null;
  }

  const pending = codes.filter((c) => !cached.has(c) && !fetchedCodes.has(c));
  console.log(`[CoverFetcher] startCoverFetch — pending: ${pending.length}, fetchedCodes: ${fetchedCodes.size}`);

  if (pending.length === 0) return;

  for (const c of pending) fetchedCodes.add(c);

  let cancelled = false;
  const completedCodes = new Set<string>();

  cancelCurrent = () => {
    cancelled = true;
    // Un-mark codes that didn't complete so next invocation retries them
    for (const c of pending) {
      if (!completedCodes.has(c)) fetchedCodes.delete(c);
    }
    console.log(`[CoverFetcher] cancelled — returned ${pending.length - completedCodes.size} codes to queue`);
  };

  const accumulated: Record<string, Card> = {};

  async function run() {
    console.log(`[CoverFetcher] loop starting — ${pending.length} sets`);
    let i = 0;
    for (const code of pending) {
      i++;
      if (cancelled) {
        console.log(`[CoverFetcher] cancelled at iteration ${i}/${pending.length} (${code})`);
        break;
      }
      let retries = 0;
      while (!cancelled) {
        try {
          const card = await fetchMostExpensiveCard(code);
          if (!cancelled && card) {
            completedCodes.add(code);
            accumulated[code] = card;
            currentOnCard(code, card);
            if (i <= 25 || i % 25 === 0) console.log(`[CoverFetcher] ✓ ${i}/${pending.length} ${code}`);
          }
          break;
        } catch (e) {
          const retryAfterMs = (e as { retryAfterMs?: number }).retryAfterMs;
          if (retryAfterMs && retries < 3) {
            retries++;
            console.log(`[CoverFetcher] rate limited on ${code}, waiting ${retryAfterMs}ms (retry ${retries}/3)`);
            await new Promise<void>((r) => setTimeout(r, retryAfterMs));
          } else {
            console.log(`[CoverFetcher] ✗ ${i}/${pending.length} ${code} — ${(e as Error).message}`);
            break;
          }
        }
      }
      // Wait for base delay, then additionally wait while paused
      if (!cancelled) {
        await new Promise<void>((r) => setTimeout(r, FETCH_DELAY_MS));
        while (paused && !cancelled) {
          await new Promise<void>((r) => setTimeout(r, 200));
        }
      }
    }
    if (!cancelled) {
      cancelCurrent = null;
      console.log(`[CoverFetcher] loop done — ${Object.keys(accumulated).length} cards fetched`);
      currentOnDone(accumulated);
    }
  }

  run();
}

/** Pause the loop while the user is browsing a set. */
export function pauseCoverFetch(): void {
  paused = true;
}

/** Resume after returning from a set view. */
export function resumeCoverFetch(): void {
  paused = false;
}

/** Clear fetched-codes memory and cancel any running loop (e.g. after clearing the cache). */
export function resetFetchedCodes(): void {
  if (cancelCurrent) {
    cancelCurrent();
    cancelCurrent = null;
  }
  fetchedCodes.clear();
}
