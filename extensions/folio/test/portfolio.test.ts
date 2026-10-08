import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeFog,
  dayChange,
  filterActivities,
  flattenPositions,
  isRecentSnapshot,
  netWorth,
  quietStreak,
  searchPositions,
  withWeights,
} from "../src/lib/portfolio.ts";
import type { Activity } from "../src/lib/types.ts";
import { formatMoney, mask } from "../src/lib/format.ts";
import { FIXTURE_ACCOUNTS, FIXTURE_ACTIVITIES, FIXTURE_HOLDINGS } from "../src/fixtures/index.ts";
import type { AccountSnapshot } from "../src/lib/types.ts";

const snapshots: AccountSnapshot[] = FIXTURE_HOLDINGS.map((h) => ({ account: h.account!, holdings: h }));
const now = new Date();

test("net worth keeps currencies separate and picks the largest as primary", () => {
  const nw = netWorth(FIXTURE_ACCOUNTS);
  const cad = nw.byCurrency.find((c) => c.currency === "CAD")!;
  const usd = nw.byCurrency.find((c) => c.currency === "USD")!;
  assert.equal(nw.accountCount, 4);
  assert.ok(Math.abs(cad.amount - (68_432.15 + 41_905.6 + 57_310.42)) < 0.01);
  assert.ok(Math.abs(usd.amount - 94_118.77) < 0.01);
  assert.equal(nw.primary?.currency, "CAD");
});

test("net worth skips closed and line-of-credit accounts", () => {
  const closed = { ...FIXTURE_ACCOUNTS[0], id: "x", status: "closed" as const };
  const loc = { ...FIXTURE_ACCOUNTS[0], id: "y", account_category: "LOC" as const };
  const nw = netWorth([FIXTURE_ACCOUNTS[0], closed, loc]);
  assert.equal(nw.accountCount, 1);
});

test("positions flatten with market value, P&L and per-currency weights that sum to 1", () => {
  const positions = flattenPositions(snapshots);
  assert.ok(positions.length >= 14);
  const byCur = new Map<string, number>();
  for (const p of positions) {
    if (p.weight !== null) byCur.set(p.currency, (byCur.get(p.currency) ?? 0) + p.weight);
  }
  for (const [, sum] of byCur) assert.ok(Math.abs(sum - 1) < 1e-9, `weights sum to ${sum}`);
  const xeqt = positions.find((p) => p.ticker === "XEQT.TO")!;
  assert.ok(Math.abs(xeqt.marketValue! - 1240 * 33.12) < 0.01);
  assert.ok(xeqt.openPnl! > 0);
  assert.equal(positions[0].marketValue! >= positions[1].marketValue!, true, "sorted by value desc");
});

test("option positions value at 100 shares per contract", () => {
  const positions = flattenPositions(snapshots);
  const opt = positions.find((p) => p.isOption)!;
  assert.ok(opt, "has an option position");
  assert.ok(Math.abs(opt.marketValue! - 2 * 9.15 * 100) < 0.01);
});

test("withWeights ignores unknown values", () => {
  const [a] = flattenPositions(snapshots);
  const out = withWeights([{ ...a, marketValue: null }, a]);
  assert.equal(out.find((p) => p.marketValue === null)?.weight, null);
  assert.equal(out.find((p) => p.marketValue !== null)?.weight, 1);
});

test("searchPositions ranks exact ticker over prefix over description", () => {
  const positions = flattenPositions(snapshots);
  const aapl = searchPositions(positions, "aapl");
  assert.equal(aapl[0].rawTicker, "AAPL");
  assert.ok(aapl.every((p) => p.rawTicker === "AAPL"));
  const v = searchPositions(positions, "v");
  assert.ok(v.length > 0);
  assert.ok(v[0].rawTicker.startsWith("V"));
  assert.equal(searchPositions(positions, "zzzz").length, 0);
  assert.equal(searchPositions(positions, "").length, positions.length);
});

test("Fog is computed from fixture activities: idle days = days since latest buy or deposit", () => {
  const fog = computeFog(snapshots, FIXTURE_ACTIVITIES, now, 365);
  // Latest cash-affecting event in the fixtures is the Wealthsimple contribution 4 days ago.
  assert.equal(fog.idleDays, 4);
  assert.equal(fog.atLeast, false);
  assert.ok(fog.lastBuy && fog.lastDeposit);
  const usd = fog.cash.find((c) => c.currency === "USD")!;
  const cad = fog.cash.find((c) => c.currency === "CAD")!;
  assert.ok(Math.abs(usd.amount - (6_120 + 18_902.27)) < 0.01);
  assert.ok(Math.abs(cad.amount - (3_214.15 + 12_480.6 + 1_842.3)) < 0.01);
  assert.equal(fog.primary?.currency, "USD");
});

test("Fog understates when nothing moved inside the window", () => {
  const fog = computeFog(snapshots, [], now, 365);
  assert.equal(fog.idleDays, 365);
  assert.equal(fog.atLeast, true);
  const onlySell = FIXTURE_ACTIVITIES.filter((a) => a.type === "SELL");
  const fog2 = computeFog(snapshots, onlySell, now, 90);
  assert.equal(fog2.idleDays, 90);
  assert.equal(fog2.atLeast, true);
});

test("Fog ignores future-dated activities", () => {
  const future = { ...FIXTURE_ACTIVITIES[0], type: "BUY", trade_date: new Date(now.getTime() + 5 * 86_400_000).toISOString() };
  const fog = computeFog(snapshots, [future], now, 365);
  assert.equal(fog.atLeast, true);
});

test("quiet streak counts days since last BUY/SELL", () => {
  const streak = quietStreak(FIXTURE_ACTIVITIES, now, 365);
  assert.equal(streak.days, 12);
  assert.equal(streak.atLeast, false);
  assert.equal(quietStreak([], now, 30).days, 30);
});

test("activity filters map SnapTrade types into tabs", () => {
  assert.ok(filterActivities(FIXTURE_ACTIVITIES, "trades").every((a) => a.type === "BUY" || a.type === "SELL"));
  assert.ok(filterActivities(FIXTURE_ACTIVITIES, "dividends").every((a) => ["DIVIDEND", "INTEREST"].includes(a.type!)));
  assert.ok(filterActivities(FIXTURE_ACTIVITIES, "deposits").every((a) => ["CONTRIBUTION", "WITHDRAWAL"].includes(a.type!)));
  assert.equal(filterActivities(FIXTURE_ACTIVITIES, "all").length, FIXTURE_ACTIVITIES.length);
});

test("formatting and masking", () => {
  assert.equal(formatMoney(1234.5, "USD"), "$1,234.50");
  assert.equal(formatMoney(1234.5, "CAD"), "$1,234.50");
  assert.equal(formatMoney(null, "USD"), "—");
  assert.equal(mask("$1", true), "••••••");
  assert.equal(mask("$1", false), "$1");
});

test("searchPositions also matches account name and institution", () => {
  const positions = flattenPositions(snapshots);
  const tfsa = searchPositions(positions, "tfsa");
  assert.ok(tfsa.length > 0);
  assert.ok(tfsa.every((p) => p.accountName === "TFSA"));
  const ibkr = searchPositions(positions, "interactive");
  assert.ok(ibkr.length > 0);
  assert.ok(ibkr.every((p) => p.institution === "Interactive Brokers"));
  // ticker matches still outrank account matches
  assert.equal(searchPositions(positions, "AAPL")[0].rawTicker, "AAPL");
});

test("dayChange reports completeness per currency instead of passing off a partial sum", () => {
  const withChange = snapshots.map((s, i) => ({
    ...s,
    dayChange: i === 0 ? undefined : { amount: 100, currency: s.account.balance.total!.currency!, asOf: "2026-09-16" },
  }));
  const result = dayChange(withChange)!;
  const cad = result.find((c) => c.currency === "CAD")!;
  const usd = result.find((c) => c.currency === "USD")!;
  assert.equal(cad.complete, false);
  assert.equal(cad.missing, 1);
  assert.equal(cad.covered, 2);
  assert.equal(cad.amount, 200);
  assert.equal(usd.complete, true);
  assert.equal(usd.amount, 100);
  assert.equal(dayChange(snapshots), null, "no history at all → null, never zero");
});

test("dayChange only adds up changes over the same dates", () => {
  // Like the real logs: two Wealthsimple accounts with history ending Sep 28, Webull every other day to Oct 1.
  const [ws1, ws2, wb] = snapshots
    .slice(0, 3)
    .map((s) => ({ ...s, account: { ...s.account, balance: { total: { amount: 1, currency: "CAD" } } } }));
  const result = dayChange([
    { ...ws1, dayChange: { amount: -44.3, currency: "CAD", asOf: "2026-09-28", from: "2026-09-27" } },
    { ...ws2, dayChange: { amount: -6.09, currency: "CAD", asOf: "2026-09-28", from: "2026-09-27" } },
    { ...wb, dayChange: { amount: -0.8, currency: "CAD", asOf: "2026-10-01", from: "2026-09-29" } },
  ])!;
  const cad = result.find((c) => c.currency === "CAD")!;
  assert.equal(cad.asOf, "2026-10-01", "the most recent period wins");
  assert.equal(cad.from, "2026-09-29");
  assert.equal(cad.amount, -0.8, "Sep 27→28 changes aren't mixed in");
  assert.equal(cad.covered, 1);
  assert.equal(cad.otherDates, 2);
  assert.equal(cad.complete, false);
});

test("dayChange: same end date but a different start is a different period", () => {
  const [a, b] = snapshots
    .slice(0, 2)
    .map((s) => ({ ...s, account: { ...s.account, balance: { total: { amount: 1, currency: "CAD" } } } }));
  const cad = dayChange([
    { ...a, dayChange: { amount: 10, currency: "CAD", asOf: "2026-10-01", from: "2026-09-30" } },
    { ...b, dayChange: { amount: 5, currency: "CAD", asOf: "2026-10-01", from: "2026-09-29" } },
  ])!.find((c) => c.currency === "CAD")!;
  assert.equal(cad.covered, 1);
  assert.equal(cad.otherDates, 1);
  assert.equal(cad.complete, false);
  assert.equal(cad.from, "2026-09-30", "the shorter period wins a tie");
  assert.equal(cad.amount, 10);
  const reversed = dayChange([
    { ...b, dayChange: { amount: 5, currency: "CAD", asOf: "2026-10-01", from: "2026-09-29" } },
    { ...a, dayChange: { amount: 10, currency: "CAD", asOf: "2026-10-01", from: "2026-09-30" } },
  ])!.find((c) => c.currency === "CAD")!;
  assert.equal(reversed.amount, 10, "account order doesn't change the result");
});

test("dayChange: the period most accounts share wins over a lone one with the same end date", () => {
  const [a, b, c] = snapshots
    .slice(0, 3)
    .map((s) => ({ ...s, account: { ...s.account, balance: { total: { amount: 1, currency: "CAD" } } } }));
  const cad = dayChange([
    { ...a, dayChange: { amount: 1, currency: "CAD", asOf: "2026-10-01", from: "2026-09-30" } },
    { ...b, dayChange: { amount: 2, currency: "CAD", asOf: "2026-10-01", from: "2026-09-29" } },
    { ...c, dayChange: { amount: 4, currency: "CAD", asOf: "2026-10-01", from: "2026-09-29" } },
  ])!.find((x) => x.currency === "CAD")!;
  assert.equal(cad.amount, 6);
  assert.equal(cad.covered, 2);
});

test("isRecentSnapshot: within the last 2 days counts as current, older doesn't", () => {
  const now = new Date("2026-10-01T00:51:22Z");
  assert.equal(isRecentSnapshot("2026-10-01", now), true);
  assert.equal(isRecentSnapshot("2026-09-29", now), true);
  assert.equal(isRecentSnapshot("2026-09-28", now), false);
  assert.equal(isRecentSnapshot("2026-09-28", new Date("2026-10-01T00:00:00.000Z")), false, "exact boundary");
  assert.equal(isRecentSnapshot("2026-09-29", new Date("2026-10-01T23:59:59.000Z")), true);
  assert.equal(isRecentSnapshot("not a date", now), false);
});

test("internal cash transfers count as deposits and restart Fog's idle clock", () => {
  const transferIn: Activity = {
    id: "t1",
    type: "INTERNAL_CASH_TRANSFER_IN",
    amount: 1068.77,
    trade_date: "2026-08-31T14:33:15Z",
  };
  const transferOut: Activity = {
    id: "t2",
    type: "INTERNAL_CASH_TRANSFER_OUT",
    amount: -850,
    trade_date: "2026-07-09T14:36:37Z",
  };
  const buy: Activity = { id: "b1", type: "BUY", amount: -100, trade_date: "2026-08-01T15:00:00Z" };
  const deposits = filterActivities([transferIn, transferOut, buy], "deposits");
  assert.deepEqual(
    deposits.map((a) => a.id),
    ["t1", "t2"],
  );
  const fog = computeFog(snapshots, [transferIn, transferOut, buy], new Date("2026-09-10T00:00:00Z"), 365);
  assert.equal(fog.lastDeposit?.toISOString(), "2026-08-31T14:33:15.000Z");
  assert.equal(fog.idleDays, 9, "counted from the transfer in, not the older buy");
});

test("a transfer between two listed accounts isn't new money for Fog", () => {
  const out: Activity = {
    id: "o",
    type: "INTERNAL_CASH_TRANSFER_OUT",
    amount: -25,
    trade_date: "2026-09-08T15:35:20Z",
    account: { id: "rrsp" },
  };
  const into: Activity = {
    id: "i",
    type: "INTERNAL_CASH_TRANSFER_IN",
    amount: 25,
    trade_date: "2026-09-08T15:35:21Z",
    account: { id: "tfsa" },
  };
  const buy: Activity = { id: "b", type: "BUY", amount: -100, trade_date: "2026-08-01T15:00:00Z" };
  const now = new Date("2026-09-10T00:00:00Z");
  const fog = computeFog(snapshots, [out, into, buy], now, 365);
  assert.equal(fog.lastDeposit, null, "matched by a transfer out of another listed account");
  assert.equal(fog.idleDays, 39, "still counted from the buy");
  const fromOutside = computeFog(snapshots, [into, buy], now, 365);
  assert.equal(fromOutside.idleDays, 1, "a transfer in from an account Folio doesn't see still counts");
});

test("net worth counts accounts SnapTrade reported no total for instead of dropping them silently", () => {
  const noTotal = { ...FIXTURE_ACCOUNTS[0], id: "z", balance: { total: null } };
  const noAmount = { ...FIXTURE_ACCOUNTS[0], id: "w", balance: { total: { currency: "CAD" } } };
  const nw = netWorth([FIXTURE_ACCOUNTS[0], noTotal, noAmount]);
  assert.equal(nw.accountCount, 1);
  assert.equal(nw.missing, 2);
  assert.equal(netWorth(FIXTURE_ACCOUNTS).missing, 0);
  const closed = { ...FIXTURE_ACCOUNTS[0], id: "c", status: "closed" as const, balance: { total: null } };
  const loc = { ...FIXTURE_ACCOUNTS[0], id: "l", account_category: "LOC" as const, balance: { total: null } };
  assert.equal(netWorth([closed, loc]).missing, 0, "closed and line-of-credit accounts aren't 'left out'");
});
