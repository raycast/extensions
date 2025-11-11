import { getPreferenceValues } from "@raycast/api";
import { Account, AccountStore, PaginatedResult, Transaction, TransactionStore } from "./types";

const { firefly_url, firefly_pat } = getPreferenceValues<Preferences>();
function buildUrl(route: string) {
  return new URL(route, firefly_url);
}

async function makeRequest<T>(endpoint: string, options?: RequestInit) {
  const response = await fetch(buildUrl(`api/v1/${endpoint}`), {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${firefly_pat}`,
    },
  });
  if (!response.headers.get("content-type")?.includes("application/json")) throw new Error(response.statusText);
  const result = await response.json();
  if (!response.ok) throw new Error((result as Error).message);
  return result as T;
}

export const firefly = {
  accounts: {
    create: (options: AccountStore) =>
      makeRequest<{ data: Account }>("accounts", {
        method: "POST",
        body: JSON.stringify(options),
      }),
    list: (options: { page: number }) => makeRequest<PaginatedResult<Account>>(`accounts?page=${options.page}`),
    listTransactions: (options: { accountId: string; page: number }) =>
      makeRequest<PaginatedResult<Transaction>>(`accounts/${options.accountId}/transactions?page=${options.page}`),
  },
  transactions: {
    create: (options: TransactionStore) =>
      makeRequest("transactions", { method: "POST", body: JSON.stringify(options) }),
  },
};
