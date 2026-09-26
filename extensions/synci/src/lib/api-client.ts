import { API_URL } from "./config";
import { dateRange } from "./finance";
import { SignInRequiredError } from "./oauth-session";
import { restoreMissingBalances } from "./balances";
import { accountBalance, decimal } from "./format";
import { amountSearch } from "./transaction-search";
import type {
  AccountHolding,
  AccountHoldings,
  BalanceEntry,
  FinancialAccount,
  FinancialConnection,
  Page,
  Period,
  Transaction,
} from "./types";

export class SynciApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export interface TransactionQuery {
  search?: string;
  accountId?: string;
  period?: Period;
  booked?: boolean;
}

export function transactionParams(query: TransactionQuery, now = new Date()): Record<string, string> {
  const range = dateRange(query.period ?? "all", now);
  return {
    include: "financial_account.financial_connection.institution,enriched",
    sort: "-booking_date,-id",
    omit_sensitive_identifiers: "1",
    ...(query.search?.trim() ? { "filter[search]": query.search.trim() } : {}),
    ...(query.accountId && query.accountId !== "all" ? { "filter[financial_account_id]": query.accountId } : {}),
    ...(query.booked !== undefined ? { "filter[booked]": query.booked ? "1" : "0" } : {}),
    ...(range.after ? { "filter[booking_date_after]": range.after, "filter[booking_date_before]": range.before } : {}),
  };
}

export class SynciClient {
  constructor(
    private token: () => Promise<string>,
    private transport: typeof fetch = fetch,
  ) {}

  async page<T>(path: string, params: Record<string, string>, page: number, signal?: AbortSignal): Promise<Page<T>> {
    const url = new URL(`${API_URL}${path}`);
    url.search = new URLSearchParams({ ...params, "page[size]": "100", "page[number]": String(page) }).toString();
    const token = await this.token();
    signal?.throwIfAborted();
    let response: Response;
    try {
      response = await this.transport(url, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30_000)]) : AbortSignal.timeout(30_000),
        redirect: "error",
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new Error("Could not reach Synci. Check your internet connection and try again.");
    }
    if (response.status === 401) throw new SignInRequiredError();
    if (response.status === 403)
      throw new SynciApiError("Synci did not grant access to this data. Reconnect to review the app's access.", 403);
    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      const seconds = retryAfter && /^\d+$/.test(retryAfter) ? ` in ${retryAfter} seconds` : " shortly";
      throw new SynciApiError(`Synci's request limit was reached. Try again${seconds}.`, 429);
    }
    if (!response.ok)
      throw new SynciApiError(
        `Synci could not load this data (HTTP ${response.status}). Try again shortly.`,
        response.status,
      );
    const payload = (await response.json().catch(() => null)) as Page<T> | null;
    if (
      !payload ||
      !Array.isArray(payload.data) ||
      !payload.meta ||
      !Number.isInteger(payload.meta.current_page) ||
      !Number.isInteger(payload.meta.last_page) ||
      payload.meta.current_page !== page ||
      payload.meta.last_page < page
    )
      throw new Error("Synci returned an unexpected response. Refresh to try again.");
    return payload;
  }

  async all<T>(path: string, params: Record<string, string>, signal?: AbortSignal, maxPages = 100): Promise<T[]> {
    const data: T[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const result = await this.page<T>(path, params, page, signal);
      data.push(...result.data);
      if (page >= result.meta.last_page) return data;
    }
    throw new Error(
      "This selection contains more than 10,000 records. Choose a shorter period or a single account to see a complete result.",
    );
  }

  accounts(signal?: AbortSignal) {
    return this.all<FinancialAccount>(
      "/finance/accounts",
      { include: "financial_connection.institution", omit_sensitive_identifiers: "1", sort: "name,id" },
      signal,
    );
  }
  async accountsWithBalances(signal?: AbortSignal): Promise<FinancialAccount[]> {
    const accounts = await this.accounts(signal);
    // Only resolve genuinely unavailable summaries; account filters stay lightweight.
    // A small worker pool avoids flooding the API for users with many accounts.
    const result = [...accounts];
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(3, accounts.length) }, async () => {
        while (next < accounts.length) {
          const index = next++;
          const account = accounts[index];
          if (decimal(accountBalance(account).amount)) continue;
          try {
            const history = await this.all<BalanceEntry>(
              `/finance/accounts/${account.id}/balances`,
              { sort: "-updated_at,-id" },
              signal,
            );
            result[index] = restoreMissingBalances(account, history);
          } catch (error) {
            if (
              signal?.aborted ||
              error instanceof SignInRequiredError ||
              (error instanceof SynciApiError && [403, 429].includes(error.status))
            )
              throw error;
            result[index] = {
              ...account,
              balance_warning:
                "Recorded balances could not be loaded completely. Refresh to try again; this balance remains unavailable.",
            };
          }
        }
      }),
    );
    return result;
  }
  connections(signal?: AbortSignal) {
    return this.all<FinancialConnection>(
      "/finance/connections",
      { include: "institution,financial_accounts_count" },
      signal,
    );
  }
  accountHoldings(accountId: number, signal?: AbortSignal) {
    return this.all<AccountHolding>(`/finance/accounts/${accountId}/holdings`, { sort: "-market_value,-id" }, signal);
  }
  async holdingsForAccounts(accounts: FinancialAccount[], signal?: AbortSignal): Promise<AccountHoldings[]> {
    const controller = new AbortController();
    const requestSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
    const result: AccountHoldings[] = new Array(accounts.length);
    let next = 0;
    try {
      await Promise.all(
        Array.from({ length: Math.min(3, accounts.length) }, async () => {
          while (next < accounts.length) {
            requestSignal.throwIfAborted();
            const index = next++;
            const account = accounts[index];
            const holdings = await this.accountHoldings(account.id, requestSignal);
            result[index] = { account, holdings };
          }
        }),
      );
    } catch (error) {
      // Do not keep loading other accounts or present a partial portfolio as complete.
      controller.abort();
      throw error;
    }
    return result;
  }
  transactions(query: TransactionQuery, page: number, signal?: AbortSignal) {
    return this.page<Transaction>("/finance/transactions", transactionParams(query), page, signal);
  }
  async transactionBatch(query: TransactionQuery, startPage: number, signal?: AbortSignal) {
    const amount = amountSearch(query.search);
    // Rules may remove every item on a server page. Skip such pages so Raycast's
    // infinite scroll never gets a zero-sized page with more results behind it.
    for (let page = startPage; page < startPage + 100; page++) {
      // Synci's text filter excludes amounts. Scan the selected account/date/status
      // scope for numeric searches. Return the first matching page promptly.
      const response = await this.transactions(amount ? { ...query, search: undefined } : query, page, signal);
      const hasMore = response.meta.current_page < response.meta.last_page;
      if (amount) {
        const matches = response.data.filter(amount.matches);
        if (matches.length || !hasMore) return { data: matches, hasMore, cursor: page + 1 };
        continue;
      }
      if (response.data.length || !hasMore) return { data: response.data, hasMore, cursor: page + 1 };
    }
    if (amount) {
      throw new Error(
        "Amount search scanned 10,000 records. Choose a shorter period or a single account and try again.",
      );
    }
    throw new Error("Too many empty result pages. Narrow your search or account filter and try again.");
  }
  spending(query: TransactionQuery, signal?: AbortSignal) {
    return this.all<Transaction>("/finance/transactions", transactionParams({ ...query, booked: true }), signal);
  }
}
