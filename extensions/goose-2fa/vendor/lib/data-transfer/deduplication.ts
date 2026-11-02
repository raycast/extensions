import { normalizeBase32Secret } from "../account-validation";
import type { AccountData, NewAccountInput } from "../types";

// ---- Deduplication ----

export function deduplicateImports(
  incoming: NewAccountInput[],
  existing: AccountData[],
): { newAccounts: NewAccountInput[]; dupeCount: number } {
  const identity = (account: Pick<NewAccountInput, "secret" | "type" | "issuer" | "name">) =>
    [account.type, normalizeBase32Secret(account.secret) ?? account.secret, account.issuer.trim().toLocaleLowerCase(), account.name.trim().toLocaleLowerCase()].join("\u0000");
  const seen = new Set(existing.map(identity));
  const newAccounts: NewAccountInput[] = [];
  for (const account of incoming) {
    const key = identity(account);
    if (seen.has(key)) continue;
    seen.add(key);
    newAccounts.push(account);
  }
  return { newAccounts, dupeCount: incoming.length - newAccounts.length };
}
