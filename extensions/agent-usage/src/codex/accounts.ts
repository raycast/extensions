import type { AccountEntry } from "../accounts/types";
import type { CodexOAuthAccount } from "./auth";

export type CodexAccountCandidateSource = "codex-home" | "manual";

export interface CodexAccountCandidate {
  id: string;
  label: string;
  token: string;
  accountId: string | null;
  source: CodexAccountCandidateSource;
  needsAccountId: boolean;
}

function hasDuplicateManualAccount(
  candidate: AccountEntry,
  seenTokens: Set<string>,
  seenAccountIds: Set<string>,
): boolean {
  const accountId = candidate.accountId?.trim();
  return seenTokens.has(candidate.token) || Boolean(accountId && seenAccountIds.has(accountId));
}

export function buildCodexAccountCandidates(
  discoveredAccounts: CodexOAuthAccount[],
  manualAccounts: AccountEntry[],
): CodexAccountCandidate[] {
  const candidates: CodexAccountCandidate[] = [];
  const seenTokens = new Set<string>();
  const seenAccountIds = new Set<string>();

  for (const account of discoveredAccounts) {
    const accountId = account.accountId?.trim() || null;
    candidates.push({
      id: account.id,
      label: account.label,
      token: account.token,
      accountId,
      source: "codex-home",
      // Discovered OAuth tokens can fetch their default account even without an
      // explicit account ID (matching the single-account useCodexUsage path).
      needsAccountId: false,
    });
    seenTokens.add(account.token);
    if (accountId) {
      seenAccountIds.add(accountId);
    }
  }

  for (const account of manualAccounts) {
    if (hasDuplicateManualAccount(account, seenTokens, seenAccountIds)) {
      continue;
    }

    const accountId = account.accountId?.trim() || null;
    candidates.push({
      id: account.id,
      label: account.label,
      token: account.token,
      accountId,
      source: "manual",
      needsAccountId: !accountId,
    });
    seenTokens.add(account.token);
    if (accountId) {
      seenAccountIds.add(accountId);
    }
  }

  return candidates;
}
