/**
 * Data source switch: bundled fixtures (demo) or live SnapTrade via Bearer token.
 * Every loader returns the same shapes so the UI never knows which one it got.
 */
import {
  FIXTURE_ACCOUNTS,
  FIXTURE_AUTHORIZATIONS,
  fixtureActivities,
  fixtureBalanceHistory,
  fixtureHoldings,
} from "../fixtures";
import { AuthError } from "./auth";
import { authMode } from "./preferences";
import {
  createConnectionPortalLink,
  getAccountActivities,
  getAccountBalances,
  getAccountPositions,
  getBalanceHistory,
  listAccounts,
  listAuthorizations,
} from "./snaptrade";
import { isInvestmentAccount } from "./portfolio";
import { buildHoldings } from "./adapt";
import type {
  Account,
  AccountFailure,
  AccountSnapshot,
  AccountValueHistoryResponse,
  ActivitiesResult,
  Activity,
  BrokerageAuthorization,
  PortfolioSnapshot,
} from "./types";

function describe(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Runs one request per account and keeps the ones that succeed. A session problem (AuthError) is
 * rethrown because it affects every account; other per-account errors are reported alongside the
 * healthy results. If nothing at all loaded, the first error is thrown so the empty state can show it.
 */
async function perAccount<T>(
  accounts: Account[],
  fn: (account: Account) => Promise<T>,
): Promise<{ ok: T[]; failures: AccountFailure[] }> {
  const results = await Promise.allSettled(accounts.map(fn));
  const ok: T[] = [];
  const failures: AccountFailure[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      ok.push(r.value);
      return;
    }
    if (r.reason instanceof AuthError) throw r.reason;
    failures.push({ account: accounts[i], message: describe(r.reason) });
  });
  if (accounts.length > 0 && ok.length === 0) {
    throw new Error(`Couldn't load any account (${failures[0].account.institution_name}: ${failures[0].message})`);
  }
  return { ok, failures };
}

export const ACTIVITY_WINDOW_DAYS = 365;

function dayChangeFrom(history: AccountValueHistoryResponse | null, currency: string | undefined) {
  const points = (history?.history ?? [])
    .filter((h) => h.date && h.total_value !== undefined && !Number.isNaN(Number(h.total_value)))
    .sort((a, b) => (a.date! < b.date! ? -1 : 1));
  if (points.length < 2 || !currency) return undefined;
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  return { amount: Number(last.total_value) - Number(prev.total_value), currency, asOf: last.date! };
}

async function snapshotFor(
  account: Account,
  fresh: boolean,
  mode: ReturnType<typeof authMode>,
): Promise<AccountSnapshot> {
  if (mode === "fixtures") {
    return {
      account,
      holdings: fixtureHoldings(account.id),
      dayChange: dayChangeFrom(fixtureBalanceHistory(account.id), account.balance.total?.currency),
    };
  }
  const [balances, positions, history] = await Promise.all([
    getAccountBalances(account.id, fresh),
    getAccountPositions(account.id, fresh),
    getBalanceHistory(account.id, fresh),
  ]);
  const holdings = buildHoldings(account, Array.isArray(balances) ? balances : [], positions.results ?? []);
  return { account, holdings, dayChange: dayChangeFrom(history, account.balance.total?.currency) };
}

export async function loadPortfolio(fresh = false): Promise<PortfolioSnapshot> {
  const mode = authMode();
  const accounts = (mode === "fixtures" ? FIXTURE_ACCOUNTS : await listAccounts(fresh)).filter(isInvestmentAccount);
  const { ok: snapshots, failures } = await perAccount(accounts, (a) => snapshotFor(a, fresh, mode));
  return { accounts: snapshots, failures, fetchedAt: new Date().toISOString() };
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Activities across all accounts for the last `days` days, each tagged with its account. Accounts that fail are reported, not fatal. */
export async function loadActivities(days = ACTIVITY_WINDOW_DAYS, fresh = false): Promise<ActivitiesResult> {
  const mode = authMode();
  const accounts = (mode === "fixtures" ? FIXTURE_ACCOUNTS : await listAccounts(fresh)).filter(isInvestmentAccount);
  const end = new Date();
  const start = new Date(end.getTime() - days * 86_400_000);
  const { ok, failures } = await perAccount(accounts, async (account): Promise<Activity[]> => {
    const list =
      mode === "fixtures"
        ? fixtureActivities(account.id, days)
        : await getAccountActivities(account.id, isoDate(start), isoDate(end), fresh);
    return list.map((a) => ({
      ...a,
      institution: a.institution ?? account.institution_name,
      account: a.account ?? { id: account.id, name: account.name, number: account.number },
    }));
  });
  return { activities: ok.flat(), failures };
}

export async function loadConnections(fresh = false): Promise<BrokerageAuthorization[]> {
  if (authMode() === "fixtures") return FIXTURE_AUTHORIZATIONS;
  return listAuthorizations(fresh);
}

export async function connectionPortalUrl(opts?: { reconnect?: string }): Promise<string> {
  if (authMode() === "fixtures") {
    throw new Error("Demo mode: turn off fixtures in preferences to open the real Connection Portal.");
  }
  const res = await createConnectionPortalLink(opts);
  if (!res.redirectURI) throw new Error("SnapTrade did not return a Connection Portal link.");
  return res.redirectURI;
}
