import type { AccountEntry } from "../accounts/types.ts";
import type { ClinePassCredential } from "./types.ts";

function validateManualCredential(token: string, userId: string): string | null {
  if (!token.startsWith("sk_")) return "ClinePass API keys must start with sk_.";
  if (!userId.startsWith("usr-")) return "Cline user IDs must start with usr-.";
  return null;
}

export function buildClinePassAccountCandidates(
  discoveredAccount: ClinePassCredential | null,
  manualAccounts: AccountEntry[],
): ClinePassCredential[] {
  const candidates: ClinePassCredential[] = discoveredAccount ? [discoveredAccount] : [];
  const seen = new Set(candidates.map((account) => `${account.userId}\n${account.token}`));

  for (const account of manualAccounts) {
    const token = account.token.trim();
    const userId = account.accountId?.trim() ?? "";
    const key = `${userId}\n${token}`;
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push({
      id: account.id,
      label: account.label,
      token,
      userId,
      source: "manual",
      validationError: validateManualCredential(token, userId),
    });
  }

  return candidates;
}

export { validateManualCredential };
