import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assembleAccounts,
  HoldingsRefreshError,
  oldDataAsOf,
  oldest,
  toLastGood,
  type LastGood,
} from "../src/lib/snapshot.ts";
import { formatAsOf, formatSnapshotDate, formatSnapshotPeriod } from "../src/lib/format.ts";
import { dayChange, netWorth } from "../src/lib/portfolio.ts";
import { AuthError } from "../src/lib/auth-error.ts";
import { FIXTURE_ACCOUNTS, fixtureHoldings } from "../src/fixtures/index.ts";
import type { AccountSnapshot } from "../src/lib/types.ts";

const [a, b, c] = FIXTURE_ACCOUNTS;
const ok = (account: typeof a, fetchedAt = "2026-09-30T14:40:00.000Z"): PromiseSettledResult<AccountSnapshot> => ({
  status: "fulfilled",
  value: { account, holdings: fixtureHoldings(account.id), fetchedAt },
});
const fail = (reason: unknown): PromiseSettledResult<AccountSnapshot> => ({ status: "rejected", reason });
const isFatal = (e: unknown) => e instanceof AuthError;
const none = () => undefined;

test("a failed account with an earlier copy stays in, marked stale, with its current account record", () => {
  const prev: LastGood = { holdings: fixtureHoldings(b.id), fetchedAt: "2026-09-30T14:25:00.000Z" };
  const current = { ...b, balance: { total: { amount: 123, currency: "CAD" } } };
  const { snapshots, failures } = assembleAccounts(
    [a, current, c],
    [ok(a), fail(new Error("SnapTrade GET /accounts/x/balances → 429")), ok(c)],
    (id) => (id === b.id ? prev : undefined),
    isFatal,
  );
  assert.deepEqual(
    snapshots.map((s) => s.account.id),
    [a.id, b.id, c.id],
    "order kept",
  );
  assert.equal(failures.length, 0);
  const stale = snapshots[1];
  assert.equal(stale.stale?.asOf, prev.fetchedAt);
  assert.match(stale.stale!.message, /429/);
  assert.equal(stale.account.balance.total?.amount, 123, "the total is the current one from /accounts");
  assert.equal(stale.holdings.account?.balance.total?.amount, 123);
  assert.deepEqual(stale.holdings.positions, prev.holdings.positions);
  assert.equal(netWorth(snapshots.map((s) => s.account)).accountCount, 3, "nothing drops out of net worth");
});

test("a failed account with nothing to fall back on is reported, not shown", () => {
  const { snapshots, failures } = assembleAccounts([a, b], [ok(a), fail(new Error("502"))], none, isFatal);
  assert.deepEqual(
    snapshots.map((s) => s.account.id),
    [a.id],
  );
  assert.deepEqual(
    failures.map((f) => [f.account.id, f.message]),
    [[b.id, "502"]],
  );
});

test("session errors are rethrown even when other accounts loaded", () => {
  const signedOut = new AuthError("Session expired. Sign in again.", "signed-out");
  assert.throws(() => assembleAccounts([a, b], [ok(a), fail(signedOut)], none, isFatal), signedOut);
});

test("nothing to show at all throws the first error", () => {
  assert.throws(
    () => assembleAccounts([a, b], [fail(new Error("boom")), fail(new Error("bang"))], none, isFatal),
    /Couldn't load any account .*boom/,
  );
});

test("every account failing but all with earlier copies still shows everything, stale", () => {
  const prev: LastGood = { holdings: { balances: [] }, fetchedAt: "2026-09-30T10:00:00.000Z" };
  const { snapshots } = assembleAccounts([a, b], [fail(new Error("x")), fail(new Error("y"))], () => prev, isFatal);
  assert.equal(snapshots.length, 2);
  assert.ok(snapshots.every((s) => s.stale));
});

const withChange = (account: typeof a, amount: number): PromiseSettledResult<AccountSnapshot> => ({
  status: "fulfilled",
  value: {
    account,
    holdings: fixtureHoldings(account.id),
    dayChange: { amount, currency: "CAD", asOf: "2026-09-29" },
    fetchedAt: "2026-09-30T14:40:00.000Z",
  },
});
// A fallback copy written before day changes were dropped from it, or tampered with: must be ignored.
const prevWithOldChange = {
  holdings: fixtureHoldings(b.id),
  fetchedAt: "2026-09-28T14:25:00.000Z",
  dayChange: { amount: 999, currency: "CAD", asOf: "2026-09-27" },
} as LastGood;
const current = { ...b, balance: { total: { amount: 1000, currency: "CAD" } } };

test("a stale account uses the day change fetched in the same load, never the old stored one", () => {
  const thisLoad = { amount: 20, currency: "CAD", asOf: "2026-09-29" };
  const { snapshots } = assembleAccounts(
    [a, current],
    [withChange(a, 10), fail(new HoldingsRefreshError(new Error("429"), thisLoad))],
    () => prevWithOldChange,
    isFatal,
  );
  assert.deepEqual(snapshots[1].dayChange, thisLoad);
  assert.equal(snapshots[1].stale!.message, "429", "the message is the underlying error's, not the wrapper's");
  const cad = dayChange(snapshots)?.find((d) => d.currency === "CAD");
  assert.equal(cad?.amount, 30);
  assert.equal(cad?.complete, true, "one 429 doesn't hide the Menu Bar delta");
});

test("a stale account without a current day change counts as missing, so the sum is marked partial", () => {
  const { snapshots } = assembleAccounts(
    [a, current],
    [withChange(a, 10), fail(new HoldingsRefreshError(new Error("429")))],
    () => prevWithOldChange,
    isFatal,
  );
  assert.equal(snapshots[1].dayChange, undefined);
  const cad = dayChange(snapshots)?.find((d) => d.currency === "CAD");
  assert.equal(cad?.amount, 10);
  assert.equal(cad?.complete, false, "the Menu Bar title hides an incomplete change");
});

test("a session error wrapped in a holdings failure is still fatal", () => {
  const signedOut = new AuthError("Session expired. Sign in again.", "signed-out");
  assert.throws(
    () => assembleAccounts([a, b], [ok(a), fail(new HoldingsRefreshError(signedOut))], none, isFatal),
    signedOut,
  );
});

test("only fresh snapshots are saved as the fallback, without their day change", () => {
  const fresh: AccountSnapshot = {
    account: a,
    holdings: {},
    dayChange: { amount: 5, currency: "CAD", asOf: "2026-09-29" },
    fetchedAt: "2026-09-30T14:40:00.000Z",
  };
  assert.deepEqual(toLastGood(fresh), { holdings: {}, fetchedAt: fresh.fetchedAt, dataAsOf: undefined });
  assert.equal(toLastGood({ ...fresh, stale: { asOf: fresh.fetchedAt!, message: "x" } }), undefined);
  assert.equal(toLastGood({ account: a, holdings: {} }), undefined);
});

test("oldest picks the earliest known time", () => {
  assert.equal(
    oldest([Date.parse("2026-09-30T14:41:00Z"), "2026-09-30T14:40:30.000Z", undefined]),
    "2026-09-30T14:40:30.000Z",
  );
  assert.equal(oldest([undefined, "not a date"]), undefined);
});

test("formatAsOf shows the time today and the date otherwise", () => {
  const now = new Date(2026, 8, 30, 16, 0);
  assert.equal(formatAsOf(new Date(2026, 8, 30, 10, 42).toISOString(), now), "10:42 AM");
  assert.equal(formatAsOf(new Date(2026, 8, 29, 22, 5).toISOString(), now), "Sep 29, 10:05 PM");
  assert.equal(formatAsOf(new Date(2025, 11, 31, 9, 0).toISOString(), now), "Dec 31, 2025, 9:00 AM");
  assert.equal(formatAsOf(undefined, now), "—");
});

test("oldDataAsOf flags brokerage data more than an hour behind the fetch", () => {
  const fetchedAt = "2026-10-01T00:51:22.000Z";
  // Wealthsimple in the logs: positions data_freshness ~21 h before the request.
  assert.equal(oldDataAsOf({ fetchedAt, dataAsOf: "2026-09-30T03:49:38Z" }), "2026-09-30T03:49:38Z");
  // Webull: live.
  assert.equal(oldDataAsOf({ fetchedAt, dataAsOf: "2026-10-01T00:51:18Z" }), undefined);
  assert.equal(oldDataAsOf({ fetchedAt }), undefined);
  // No time zone: read as UTC, not the Mac's local time.
  assert.equal(oldDataAsOf({ fetchedAt, dataAsOf: "2026-10-01T00:51:18" }), undefined);
});

test("a stale account keeps the data time of its fallback copy", () => {
  const prev: LastGood = {
    holdings: fixtureHoldings(b.id),
    fetchedAt: "2026-09-30T14:25:00.000Z",
    dataAsOf: "2026-09-30T03:49:38Z",
  };
  const { snapshots } = assembleAccounts([a, b], [ok(a), fail(new Error("429"))], () => prev, isFatal);
  assert.equal(snapshots[1].dataAsOf, prev.dataAsOf);
  assert.equal(toLastGood({ account: a, holdings: {}, fetchedAt: "x", dataAsOf: "y" })?.dataAsOf, "y");
});

test("snapshot dates format as calendar dates in any time zone", () => {
  assert.equal(formatSnapshotDate("2026-09-28"), "Sep 28");
  assert.equal(formatSnapshotPeriod({ from: "2026-09-29", asOf: "2026-10-01" }), "Sep 29 → Oct 1");
  assert.equal(formatSnapshotPeriod({ asOf: "2026-10-01" }), "to Oct 1");
});

test("a time without a zone is shown as the same instant it's compared as (UTC)", () => {
  const now = new Date("2026-10-01T12:00:00Z");
  assert.equal(formatAsOf("2026-10-01T09:30:00", now), formatAsOf("2026-10-01T09:30:00Z", now));
});
