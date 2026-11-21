/**
 * Assembling a portfolio snapshot from per-account results. Pure (no Raycast imports).
 * Rule: never make an account silently disappear. A failed refresh falls back to the last good
 * holdings, labelled with their time; only an account with nothing to fall back on is left out,
 * and it's reported as a failure.
 */
import { parseTime } from "./format";
import type { Account, AccountFailure, AccountSnapshot } from "./types";

/**
 * What's kept per account so a failed refresh can fall back to it. No day change: an old one would
 * be summed into today's change as if it were current.
 */
export interface LastGood {
  holdings: AccountSnapshot["holdings"];
  /** When those holdings were fetched (ISO). */
  fetchedAt: string;
  /** How current SnapTrade's data was at that fetch (ISO), if it said. */
  dataAsOf?: string;
}

export function toLastGood(s: AccountSnapshot): LastGood | undefined {
  if (s.stale || !s.fetchedAt) return undefined;
  return { holdings: s.holdings, fetchedAt: s.fetchedAt, dataAsOf: s.dataAsOf };
}

/** Brokerage data more than this far behind the fetch is labelled with its own time. */
export const OLD_DATA_MS = 60 * 60_000;

/**
 * SnapTrade's own data time for an account when it's well behind when Folio fetched it (some
 * brokerages aren't live), so the UI can say "data from …" instead of implying it's current.
 */
export function oldDataAsOf(s: Pick<AccountSnapshot, "dataAsOf" | "fetchedAt">): string | undefined {
  if (!s.dataAsOf || !s.fetchedAt) return undefined;
  const behind = Date.parse(s.fetchedAt) - parseTime(s.dataAsOf);
  return behind > OLD_DATA_MS ? s.dataAsOf : undefined;
}

function describe(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Balances or positions failed for an account. Carries the day change fetched alongside them:
 * balance history is a separate request, so it's still current even when the holdings aren't.
 */
export class HoldingsRefreshError extends Error {
  constructor(
    public readonly error: unknown,
    public readonly dayChange?: AccountSnapshot["dayChange"],
  ) {
    super(`Holdings refresh failed: ${describe(error)}`);
    this.name = "HoldingsRefreshError";
  }
}

/**
 * Combines per-account results in account order. `isFatal` errors (a session problem affects every
 * account) are rethrown. A failed account with a last good copy is kept, marked stale, with the
 * current /accounts record so its total stays current, and only a day change fetched in this same
 * load (never the old one); one without a copy is reported in `failures`.
 * If nothing at all can be shown, the first error is thrown so the empty state can show it.
 */
export function assembleAccounts(
  accounts: Account[],
  results: PromiseSettledResult<AccountSnapshot>[],
  lastGood: (accountId: string) => LastGood | undefined,
  isFatal: (e: unknown) => boolean,
): { snapshots: AccountSnapshot[]; failures: AccountFailure[] } {
  const snapshots: AccountSnapshot[] = [];
  const failures: AccountFailure[] = [];
  results.forEach((r, i) => {
    const account = accounts[i];
    if (r.status === "fulfilled") {
      snapshots.push(r.value);
      return;
    }
    const partial = r.reason instanceof HoldingsRefreshError ? r.reason : undefined;
    const error = partial ? partial.error : r.reason;
    if (isFatal(error)) throw error;
    const message = describe(error);
    const prev = lastGood(account.id);
    if (prev) {
      snapshots.push({
        account,
        holdings: { ...prev.holdings, account },
        dayChange: partial?.dayChange,
        fetchedAt: prev.fetchedAt,
        dataAsOf: prev.dataAsOf,
        stale: { asOf: prev.fetchedAt, message },
      });
    } else {
      failures.push({ account, message });
    }
  });
  if (accounts.length > 0 && snapshots.length === 0) {
    throw new Error(`Couldn't load any account (${failures[0].account.institution_name}: ${failures[0].message})`);
  }
  return { snapshots, failures };
}

/** The oldest of the given times as ISO, or undefined if none are known. */
export function oldest(times: (string | number | undefined)[]): string | undefined {
  let min: number | undefined;
  for (const t of times) {
    if (t === undefined) continue;
    const ms = typeof t === "number" ? t : Date.parse(t);
    if (Number.isNaN(ms)) continue;
    if (min === undefined || ms < min) min = ms;
  }
  return min === undefined ? undefined : new Date(min).toISOString();
}
