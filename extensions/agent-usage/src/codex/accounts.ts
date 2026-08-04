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
  const seenTokens = new Set<string>();
  const seenAccountIds = new Set<string>();
  // Candidates added without an account ID, keyed by token. A later entry that
  // supplies an explicit account ID for the same token enriches one of these
  // rather than adding a redundant token-default entry.
  const tokenDefaultCandidate = new Map<string, CodexAccountCandidate>();

  const registerCandidate = (candidate: CodexAccountCandidate): void => {
    candidates.push(candidate);
    seenTokens.add(candidate.token);
    if (candidate.accountId) {
      seenAccountIds.add(candidate.accountId);
    } else {
      tokenDefaultCandidate.set(candidate.token, candidate);
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

    if (accountId) {
      // The (token, account ID) pair determines the usage the API returns, so an
      // account ID already represented — even via a different token — is a true
      // duplicate. Distinct account IDs on the same token are separate accounts
      // and must each be kept.
      if (seenAccountIds.has(accountId)) {
        continue;
      }

      const tokenDefault = tokenDefaultCandidate.get(account.token);
      if (tokenDefault) {
        // Enrich a same-token candidate that was added without an account ID
        // instead of adding a redundant entry; the configured account would
        // otherwise be lost and the fetch would use the token's default account.
        tokenDefault.accountId = accountId;
        seenAccountIds.add(accountId);
        tokenDefaultCandidate.delete(account.token);
        continue;
      }
    } else if (seenTokens.has(account.token)) {
      // No account ID to distinguish it and the token is already represented.
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
