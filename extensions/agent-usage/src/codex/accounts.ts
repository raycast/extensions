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

export function buildCodexAccountCandidates(
  discoveredAccounts: CodexOAuthAccount[],
  manualAccounts: AccountEntry[],
): CodexAccountCandidate[] {
  const candidates: CodexAccountCandidate[] = [];
  const candidatesByToken = new Map<string, CodexAccountCandidate>();
  const seenAccountIds = new Set<string>();

  const registerCandidate = (candidate: CodexAccountCandidate): void => {
    candidates.push(candidate);
    candidatesByToken.set(candidate.token, candidate);
    if (candidate.accountId) {
      seenAccountIds.add(candidate.accountId);
    }
  };

  for (const account of discoveredAccounts) {
    registerCandidate({
      id: account.id,
      label: account.label,
      token: account.token,
      accountId: account.accountId?.trim() || null,
      source: "codex-home",
      // Discovered OAuth tokens can fetch their default account even without an
      // explicit account ID (matching the single-account useCodexUsage path).
      needsAccountId: false,
    });
  }

  for (const account of manualAccounts) {
    const accountId = account.accountId?.trim() || null;
    const existing = candidatesByToken.get(account.token);

    if (existing) {
      // Same token as an already-added account. Keep the existing (file-backed)
      // token, but adopt this entry's explicit account ID if the existing one
      // lacked it — otherwise the manually configured account would be lost and
      // the fetch would fall back to the token's default account.
      if (!existing.accountId && accountId) {
        existing.accountId = accountId;
        seenAccountIds.add(accountId);
      }
      continue;
    }

    if (accountId && seenAccountIds.has(accountId)) {
      continue;
    }

    registerCandidate({
      id: account.id,
      label: account.label,
      token: account.token,
      accountId,
      source: "manual",
      needsAccountId: !accountId,
    });
  }

  return candidates;
}
