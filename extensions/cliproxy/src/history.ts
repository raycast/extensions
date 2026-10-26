import { environment } from "@raycast/api";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { ConnectionId } from "./api";
import { loadQuota, percentLeft, QuotaAccount, QuotaResult } from "./quota";
import { HistoryStore } from "./historyStore";
import { Observation } from "./usageModel";

export function historyStore(connection: ConnectionId): HistoryStore {
  return new HistoryStore(join(environment.supportPath, "quota-history-v1", connection));
}

export function accountKey(account: QuotaAccount): string {
  return createHash("sha256")
    .update(JSON.stringify([account.provider, account.id ?? account.auth_index]))
    .digest("hex")
    .slice(0, 24);
}

export function observations(accounts: QuotaAccount[], quotas: Record<string, QuotaResult>): Observation[] {
  return accounts.flatMap((a) => {
    const result = quotas[a.auth_index];
    if (!result?.quota || result.error || !result.fetchedAt) return [];
    return result.quota.windows.flatMap((window) => {
      const left = percentLeft(window);
      return left === null
        ? []
        : [
            {
              account: accountKey(a),
              provider: a.provider,
              label: window.label,
              at: result.fetchedAt!,
              left,
              resetsAt: window.resetsAt,
            },
          ];
    });
  });
}

/** Every fresh quota fetch contributes an observation, including ordinary account-list refreshes. */
export async function fetchAllQuotas(connection: ConnectionId, accounts: QuotaAccount[]) {
  const entries = await Promise.all(accounts.map(async (a) => [a.auth_index, await loadQuota(connection, a)] as const));
  const quotas = Object.fromEntries(entries);
  let historyError: string | null = null;
  try {
    await historyStore(connection).append(observations(accounts, quotas));
  } catch {
    historyError = "Couldn't save usage history. Check available disk space and reload.";
  }
  return { quotas, historyError };
}
