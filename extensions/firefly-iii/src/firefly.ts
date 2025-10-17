import { getPreferenceValues } from "@raycast/api";
import { Account, PaginatedResult, Transaction } from "./types";

class Firefly {
  private url: string;
  private personalAccessToken: string;
  public accounts: AccountsService;

  constructor(url: string, personalAccessToken: string) {
    this.url = url;
    this.personalAccessToken = personalAccessToken;
    this.accounts = new AccountsService(this);
  }

  public buildUrl(route: string) {
    return new URL(route, this.url);
  }

  protected async request<T>(endpoint: string, options?: RequestInit) {
    const response = await fetch(this.buildUrl(`api/v1/${endpoint}`), {
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.personalAccessToken}`
      },
    });
    if (!response.headers.get("content-type")?.includes("json")) throw new Error(response.statusText);
    const result = await response.json();
    if (!response.ok) throw new Error((result as Error).message);
    return result as T;
  }
}

class AccountsService {
  constructor(private client: Firefly) {}
  async list(options: {page: number}) {
    return this.client["request"]<PaginatedResult<Account>>(`accounts?page=${options.page}`);
  }
  async listTransactions(options: {accountId: string, page: number}) {
    return this.client["request"]<PaginatedResult<Transaction>>(`accounts/${options.accountId}/transactions?page=${options.page}`);
  }
}

const { firefly_url, firefly_pat } = getPreferenceValues<Preferences>();
export const firefly = new Firefly(firefly_url, firefly_pat);
