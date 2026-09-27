import { requireLogins } from "../logins";
import { getAccounts, mercuryGet, Transaction } from "../mercury";

type Input = {
  /**
   * The Mercury bank account ID to limit results to. Omit to search every account.
   */
  accountId?: string;
  /**
   * Maximum number of transactions to return, newest first. Defaults to 25.
   */
  limit?: number;
  /**
   * Text to search for in counterparty names, descriptions, notes, and memos.
   */
  search?: string;
  /**
   * Only include transactions created on or after this date (YYYY-MM-DD).
   */
  start?: string;
  /**
   * Only include transactions created on or before this date (YYYY-MM-DD).
   */
  end?: string;
  /**
   * Only include transactions with this status. Omit for all statuses.
   */
  status?: "pending" | "sent" | "cancelled" | "failed" | "reversed" | "blocked";
};

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 1000;

/**
 * Retrieves transactions, newest first, across every connected Mercury account or for one bank
 * account. Without a start date, Mercury's per-account endpoint only returns the last 30 days,
 * so a start date is always sent.
 */
export default async function getTransactions(input: Input = {}) {
  const logins = await requireLogins();
  const { accountId, search, end, status } = input;
  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  // ponytail: one page of up to 1000 per login is the ceiling; paginate if the AI ever needs more.
  const params = new URLSearchParams({ limit: String(limit), order: "desc", start: input.start ?? "2000-01-01" });
  if (search) params.set("search", search);
  if (end) params.set("end", end);
  if (status) params.set("status", status);

  const results = await Promise.all(
    logins.map(async (login) => {
      if (accountId) {
        const owns = (await getAccounts(login.token)).some((account) => account.id === accountId);
        if (!owns) return [];
      }
      const path = accountId ? `/account/${accountId}/transactions` : "/transactions";
      const data = await mercuryGet<{ transactions: Transaction[] }>(login.token, `${path}?${params}`);
      return data.transactions.map((transaction) => ({ organization: login.name, ...transaction }));
    }),
  );
  return results
    .flat()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
