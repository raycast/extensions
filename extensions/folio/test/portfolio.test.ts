import { test } from "node:test";
import assert from "node:assert/strict";
import { computeFog, filterActivities, flattenPositions, netWorth, quietStreak, searchPositions, withWeights } from "../src/lib/portfolio.ts";
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
