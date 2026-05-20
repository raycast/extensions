import test from "node:test";
import assert from "node:assert/strict";

import {
  accountLabel,
  decodeProjectSelection,
  encodeProjectSelection,
  firstProjectSelectionValue,
  isProjectSelectionValueAvailable,
  normalizeBaseUrl,
  removeAccountFromList,
  upsertAccount,
} from "../helpers/account-model";

const account = {
  id: "account-1",
  providerId: "posthog-account-1",
  email: "person@example.com",
  name: "Example Person",
  region: "us" as const,
  baseUrl: "https://us.posthog.com",
  authBaseUrl: "https://us.posthog.com",
  createdAt: "2026-05-20T17:00:00.000Z",
  updatedAt: "2026-05-20T17:00:00.000Z",
};

test("normalizeBaseUrl removes trailing slashes", () => {
  assert.equal(normalizeBaseUrl("https://eu.posthog.com///"), "https://eu.posthog.com");
});

test("accountLabel prefers email and includes region", () => {
  assert.equal(accountLabel(account), "person@example.com (US)");
});

test("accountLabel falls back to base URL when no identity is available", () => {
  assert.equal(accountLabel({ ...account, email: undefined, name: undefined }), "US - https://us.posthog.com");
});

test("upsertAccount replaces an existing account with the same id", () => {
  const updated = { ...account, email: "updated@example.com" };

  assert.deepEqual(upsertAccount([account], updated), [updated]);
});

test("removeAccountFromList removes the matching account id", () => {
  const otherAccount = { ...account, id: "account-2", providerId: "posthog-account-2" };

  assert.deepEqual(removeAccountFromList([account, otherAccount], "account-1"), [otherAccount]);
});

test("encodeProjectSelection stores account and project ids", () => {
  assert.equal(encodeProjectSelection("account-1", 42), "account-1:42");
});

test("decodeProjectSelection returns account and project ids", () => {
  assert.deepEqual(decodeProjectSelection("account-1:42"), { accountId: "account-1", projectId: "42" });
});

test("isProjectSelectionValueAvailable confirms matching account project pairs", () => {
  const groups = [{ account, projects: [{ id: 42, name: "FastAPI Cloud" }] }];

  assert.equal(isProjectSelectionValueAvailable(groups, "account-1:42"), true);
  assert.equal(isProjectSelectionValueAvailable(groups, "account-1:43"), false);
});

test("firstProjectSelectionValue selects the first account project pair", () => {
  const otherAccount = { ...account, id: "account-2", providerId: "posthog-account-2" };
  const groups = [
    { account, projects: [{ id: 1, name: "US Project" }] },
    { account: otherAccount, projects: [{ id: 2, name: "EU Project" }] },
  ];

  assert.equal(firstProjectSelectionValue(groups), "account-1:1");
});
