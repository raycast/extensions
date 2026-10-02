import { expect, test } from "bun:test";
import { createUncheckedHealthChecks } from "../src/lib/unchecked-health";
import type { Connection } from "../src/lib/types";

const connection = (name: string, lastHealth?: Connection["lastHealth"]): Connection => ({
  integration: "custom_service",
  owner: "user",
  name,
  address: `tools.custom_service.user.${name}`,
  provider: "oauth",
  template: "oauth",
  missingOAuthScopes: [],
  lastHealth,
});

test("new unchecked connections are probed once and checks run serially", async () => {
  const calls: string[] = [];
  let active = 0;
  let refreshed = 0;
  const checks = createUncheckedHealthChecks(
    async (row) => {
      active++;
      expect(active).toBe(1);
      await Promise.resolve();
      calls.push(row.name);
      active--;
    },
    async () => {
      refreshed++;
    },
  );
  const rows = [
    connection("new"),
    connection("unknown", { status: "unknown", checkedAt: 1 }),
    connection("healthy", { status: "healthy", checkedAt: 1 }),
  ];
  await checks.observe(rows);
  await checks.observe(rows);
  expect(calls).toEqual(["new", "unknown"]);
  expect(refreshed).toBe(2);
  checks.dispose();
});

test("clearing a saved health verdict after reconnect triggers a fresh check", async () => {
  const calls: string[] = [];
  const checks = createUncheckedHealthChecks(
    async (row) => {
      calls.push(row.name);
    },
    async () => {},
  );
  await checks.observe([connection("account", { status: "expired", checkedAt: 1 })]);
  expect(calls).toEqual([]);
  await checks.observe([connection("account", null)]);
  await checks.observe([connection("account", { status: "healthy", checkedAt: 2 })]);
  await checks.observe([connection("account", { status: "healthy", checkedAt: 3 })]);
  expect(calls).toEqual(["account"]);
  checks.dispose();
});

test("failed checks do not retry on reload or prevent checking the next connection", async () => {
  const calls: string[] = [];
  const checks = createUncheckedHealthChecks(
    async (row) => {
      calls.push(row.name);
      if (row.name === "failed") throw new Error("Unavailable");
    },
    async () => {},
  );
  const rows = [connection("failed"), connection("next")];
  await checks.observe(rows);
  await checks.observe([...rows]);
  expect(calls).toEqual(["failed", "next"]);
  checks.dispose();
});

test("closing aborts the active probe and prevents queued checks and reloads", async () => {
  let signal: AbortSignal | undefined;
  let finish!: () => void;
  const calls: string[] = [];
  let reloads = 0;
  const checks = createUncheckedHealthChecks(
    async (row, abort) => {
      signal = abort;
      calls.push(row.name);
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
    },
    async () => {
      reloads++;
    },
  );
  const pending = checks.observe([connection("first"), connection("second")]);
  await Promise.resolve();
  checks.dispose();
  expect(signal?.aborted).toBe(true);
  finish();
  await pending;
  expect(calls).toEqual(["first"]);
  expect(reloads).toBe(0);
});

test("queued checks skip removed connections or connections already checked elsewhere", async () => {
  const calls: string[] = [];
  const checks = createUncheckedHealthChecks(
    async (row) => {
      calls.push(row.name);
    },
    async () => {},
  );
  const pending = checks.observe([connection("removed"), connection("checked")]);
  await checks.observe([connection("checked", { status: "healthy", checkedAt: 1 })]);
  await pending;
  expect(calls).toEqual([]);
  checks.dispose();
});

test("recreating an unchecked connection under the same identity gets a new attempt", async () => {
  const calls: string[] = [];
  const checks = createUncheckedHealthChecks(
    async (row) => {
      calls.push(row.name);
    },
    async () => {},
  );
  await checks.observe([connection("account")]);
  await checks.observe([]);
  await checks.observe([connection("account", null)]);
  expect(calls).toEqual(["account", "account"]);
  checks.dispose();
});

test("recreation invalidates old queued work and schedules exactly one fresh attempt", async () => {
  for (const waitForRemoval of [false, true]) {
    const calls: string[] = [];
    const checks = createUncheckedHealthChecks(
      async (row) => {
        calls.push(row.name);
      },
      async () => {},
    );
    const first = checks.observe([connection("account")]);
    const removed = checks.observe([]);
    if (waitForRemoval) await removed;
    const recreated = checks.observe([connection("account", null)]);
    await Promise.all([first, removed, recreated]);
    expect(calls).toEqual(["account"]);
    checks.dispose();
  }
});
