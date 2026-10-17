/**
 * Bundled sample data: Wealthsimple + Questrade + IBKR. Enabled by the `useFixtures` preference.
 * Nothing here is real. Balances are invented; dates are relative to now so Fog stays illustrative.
 */
import type {
  Account,
  AccountHoldings,
  AccountValueHistoryResponse,
  Activity,
  BrokerageAuthorization,
} from "../lib/types";
import { IBKR_ACTIVITIES, IBKR_AUTH, IBKR_HOLDINGS, IBKR_INDIVIDUAL } from "./ibkr";
import { QT_ACTIVITIES, QT_AUTH, QT_HOLDINGS, QT_MARGIN } from "./questrade";
import { WS_ACTIVITIES, WS_AUTH, WS_HOLDINGS, WS_RRSP, WS_TFSA } from "./wealthsimple";
import { isoDateDaysAgo } from "./helpers";

export const FIXTURE_ACCOUNTS: Account[] = [WS_TFSA, WS_RRSP, QT_MARGIN, IBKR_INDIVIDUAL];
export const FIXTURE_HOLDINGS: AccountHoldings[] = [...WS_HOLDINGS, ...QT_HOLDINGS, ...IBKR_HOLDINGS];
export const FIXTURE_ACTIVITIES: Activity[] = [...WS_ACTIVITIES, ...QT_ACTIVITIES, ...IBKR_ACTIVITIES];
export const FIXTURE_AUTHORIZATIONS: BrokerageAuthorization[] = [WS_AUTH, QT_AUTH, IBKR_AUTH];

/** Two-day balance history per account so the fixtures exercise the day-change path. */
export function fixtureBalanceHistory(accountId: string): AccountValueHistoryResponse {
  const account = FIXTURE_ACCOUNTS.find((a) => a.id === accountId);
  const today = account?.balance.total?.amount ?? 0;
  const deltas: Record<string, number> = {
    "acct-ws-tfsa": 412.9,
    "acct-ws-rrsp": -138.25,
    "acct-qt-margin": 296.1,
    "acct-ibkr-ind": 1_204.33,
  };
  const delta = deltas[accountId] ?? 0;
  return {
    history: [
      { date: isoDateDaysAgo(1), total_value: (today - delta).toFixed(2) },
      { date: isoDateDaysAgo(0), total_value: today.toFixed(2) },
    ],
  };
}

export function fixtureHoldings(accountId: string): AccountHoldings {
  const h = FIXTURE_HOLDINGS.find((x) => x.account?.id === accountId);
  if (!h) throw new Error(`No fixture holdings for ${accountId}`);
  return h;
}

export function fixtureActivities(accountId: string, sinceDays: number): Activity[] {
  const cutoff = Date.now() - sinceDays * 86_400_000;
  return FIXTURE_ACTIVITIES.filter(
    (a) => a.account?.id === accountId && new Date(a.trade_date ?? 0).getTime() >= cutoff,
  );
}
