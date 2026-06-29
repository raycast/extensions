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

test("buildCodexAccountCandidates skips manual accounts duplicated by token or account ID", () => {
  const manualAccounts: AccountEntry[] = [
    { id: "same-token", label: "Same Token", token: "active-token", accountId: "acct_other" },
    { id: "same-account", label: "Same Account", token: "other-token", accountId: "acct_active" },
    { id: "unique", label: "Unique", token: "unique-token", accountId: "acct_unique" },
  ];

  const candidates = buildCodexAccountCandidates([discoveredAccount], manualAccounts);

  assert.deepEqual(
    candidates.map((candidate) => candidate.id),
    ["codex-active", "unique"],
  );
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
