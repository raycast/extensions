import test from "node:test";
import assert from "node:assert/strict";
import { buildCodexAccountCandidates } from "./accounts";
import type { CodexOAuthAccount } from "./auth";
import type { AccountEntry } from "../accounts/types";

const discoveredAccount: CodexOAuthAccount = {
  id: "codex-active",
  label: "Active",
  token: "active-token",
  accountId: "acct_active",
  userId: "user_active",
  source: "active",
  authFilePath: "/tmp/.codex/auth.json",
};

test("buildCodexAccountCandidates prefers file-backed Codex OAuth accounts before manual accounts", () => {
  const manualAccounts: AccountEntry[] = [
    { id: "manual-work", label: "Manual Work", token: "manual-token", accountId: "acct_manual" },
  ];

  const candidates = buildCodexAccountCandidates([discoveredAccount], manualAccounts);

  assert.deepEqual(
    candidates.map((candidate) => ({
      id: candidate.id,
      label: candidate.label,
      token: candidate.token,
      accountId: candidate.accountId,
      source: candidate.source,
      needsAccountId: candidate.needsAccountId,
    })),
    [
      {
        id: "codex-active",
        label: "Active",
        token: "active-token",
        accountId: "acct_active",
        source: "codex-home",
        needsAccountId: false,
      },
      {
        id: "manual-work",
        label: "Manual Work",
        token: "manual-token",
        accountId: "acct_manual",
        source: "manual",
        needsAccountId: false,
      },
    ],
  );
});

test("buildCodexAccountCandidates dedupes manual accounts by account ID while keeping distinct ones", () => {
  const manualAccounts: AccountEntry[] = [
    // Same token as the discovered account but a distinct account ID — a separate
    // ChatGPT account reachable by the same login, so it must be kept.
    { id: "same-token", label: "Same Token", token: "active-token", accountId: "acct_other" },
    // Same account ID as the discovered account via a different token — identical
    // usage, so it is dropped.
    { id: "same-account", label: "Same Account", token: "other-token", accountId: "acct_active" },
    { id: "unique", label: "Unique", token: "unique-token", accountId: "acct_unique" },
  ];

  const candidates = buildCodexAccountCandidates([discoveredAccount], manualAccounts);

  assert.deepEqual(
    candidates.map((candidate) => candidate.id),
    ["codex-active", "same-token", "unique"],
  );
});

test("buildCodexAccountCandidates keeps manual accounts that share a token but target different accounts", () => {
  const manualAccounts: AccountEntry[] = [
    { id: "manual-personal", label: "Personal", token: "shared-token", accountId: "acct_personal" },
    { id: "manual-work", label: "Work", token: "shared-token", accountId: "acct_work" },
  ];

  const candidates = buildCodexAccountCandidates([], manualAccounts);

  assert.deepEqual(
    candidates.map((candidate) => ({ id: candidate.id, accountId: candidate.accountId })),
    [
      { id: "manual-personal", accountId: "acct_personal" },
      { id: "manual-work", accountId: "acct_work" },
    ],
  );
});

test("buildCodexAccountCandidates dedupes manual accounts that share a token and account ID", () => {
  const manualAccounts: AccountEntry[] = [
    { id: "manual-first", label: "First", token: "shared-token", accountId: "acct_shared" },
    { id: "manual-second", label: "Second", token: "shared-token", accountId: "acct_shared" },
  ];

  const candidates = buildCodexAccountCandidates([], manualAccounts);

  assert.deepEqual(
    candidates.map((candidate) => candidate.id),
    ["manual-first"],
  );
});

test("buildCodexAccountCandidates backfills a manual account ID onto a token-matched discovered account that lacks one", () => {
  const discoveredWithoutAccountId: CodexOAuthAccount = {
    id: "codex-active-missing-account",
    label: "Active",
    token: "active-token",
    accountId: null,
    userId: null,
    source: "active",
    authFilePath: "/tmp/.codex/auth.json",
  };
  const manualAccounts: AccountEntry[] = [
    { id: "manual-work", label: "Manual Work", token: "active-token", accountId: "acct_manual" },
  ];

  const candidates = buildCodexAccountCandidates([discoveredWithoutAccountId], manualAccounts);

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].id, "codex-active-missing-account");
  assert.equal(candidates[0].source, "codex-home");
  assert.equal(candidates[0].accountId, "acct_manual");
  assert.equal(candidates[0].needsAccountId, false);
});

test("buildCodexAccountCandidates drops a manual account that duplicates a discovered token and account ID", () => {
  const manualAccounts: AccountEntry[] = [
    { id: "manual-work", label: "Manual Work", token: "active-token", accountId: "acct_active" },
  ];

  const candidates = buildCodexAccountCandidates([discoveredAccount], manualAccounts);

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].id, "codex-active");
  assert.equal(candidates[0].accountId, "acct_active");
});

test("buildCodexAccountCandidates marks manual Codex entries without account IDs as unsafe to fetch", () => {
  const manualAccounts: AccountEntry[] = [{ id: "manual-no-account", label: "Manual", token: "manual-token" }];

  const candidates = buildCodexAccountCandidates([], manualAccounts);

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].id, "manual-no-account");
  assert.equal(candidates[0].accountId, null);
  assert.equal(candidates[0].needsAccountId, true);
});

test("buildCodexAccountCandidates lets discovered Codex entries without account IDs fetch their default account", () => {
  const discoveredWithoutAccountId: CodexOAuthAccount = {
    id: "codex-active-missing-account",
    label: "Active",
    token: "active-token-no-account",
    accountId: null,
    userId: null,
    source: "active",
    authFilePath: "/tmp/.codex/auth.json",
  };

  const candidates = buildCodexAccountCandidates([discoveredWithoutAccountId], []);

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].id, "codex-active-missing-account");
  assert.equal(candidates[0].accountId, null);
  assert.equal(candidates[0].needsAccountId, false);
});
