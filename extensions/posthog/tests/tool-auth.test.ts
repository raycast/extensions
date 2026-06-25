import test from "node:test";
import assert from "node:assert/strict";

import { requireAccountId, requireProjectId, resolveToolAccount } from "../src/tool-auth";

const account = {
  id: "account-1",
};

test("requireAccountId rejects missing account id", () => {
  assert.throws(() => requireAccountId(undefined), /Missing accountId/);
});

test("resolveToolAccount rejects when no accounts are connected", () => {
  assert.throws(() => resolveToolAccount([], "account-1"), /No PostHog accounts are connected/);
});

test("resolveToolAccount rejects unknown account ids", () => {
  assert.throws(() => resolveToolAccount([account], "missing-account"), /Unknown accountId/);
});

test("resolveToolAccount returns the matching account", () => {
  assert.equal(resolveToolAccount([account], "account-1"), account);
});

test("requireProjectId rejects missing or invalid project ids", () => {
  assert.throws(() => requireProjectId(undefined), /Missing projectId/);
  assert.throws(() => requireProjectId(0), /Missing projectId/);
});

test("requireProjectId returns valid project ids", () => {
  assert.equal(requireProjectId(123), 123);
});
