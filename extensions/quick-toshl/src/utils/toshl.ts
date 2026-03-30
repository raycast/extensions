import axios, { AxiosInstance } from "axios";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import {
  Transaction,
  Category,
  Tag,
  TransactionInput,
  TransferInput,
  Account,
  Currency,
  Budget,
  Planning,
  CategoryCreateInput,
  CategoryUpdateInput,
  TagCreateInput,
  TagUpdateInput,
  AccountCreateInput,
  AccountUpdateInput,
  BudgetCreateInput,
  BudgetUpdateInput,
} from "./types";
import { MOCK_ACCOUNTS, MOCK_BUDGETS, MOCK_CATEGORIES, MOCK_PLANNING, MOCK_TAGS, MOCK_TRANSACTIONS } from "./mockData";

const BASE_URL = "https://api.toshl.com";

/** Max age for reusing metadata after an API error (not for normal ETag revalidation). */
const CACHE_TTL = 24 * 60 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag?: string;
  lastModified?: string;
}

export type EntryListParams = {
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
  search?: string;
  categories?: string;
  tags?: string;
  accounts?: string;
  type?: string;
};

function cleanParams<T extends Record<string, unknown>>(params: T): Record<string, string | number> {
  return Object.entries(params).reduce(
    (acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        acc[key] = value as string | number;
      }
      return acc;
    },
    {} as Record<string, string | number>,
  );
}

/** Read `Location` from Axios/fetch-style headers (CI uses strict Axios header typings). */
function locationHeaderFrom(headers: unknown): string | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  const h = headers as Record<string, unknown>;
  const raw = h["location"] ?? h["Location"];
  if (raw == null) return undefined;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && raw[0] != null) return String(raw[0]);
  return String(raw);
}

/** Toshl often returns `201` with an empty body; resource id is in `Location` (e.g. `/categories/123`). */
function createdResourceId(
  response: { headers: unknown; data: unknown },
  segment: "categories" | "tags" | "accounts" | "entries" | "budgets",
): string | undefined {
  const locStr = locationHeaderFrom(response.headers);
  if (locStr) {
    const m = locStr.match(new RegExp(`/${segment}/([^/\\s?]+)`));
    if (m) return m[1];
  }
  if (response.data && typeof response.data === "object" && response.data !== null && "id" in response.data) {
    const id = (response.data as { id: unknown }).id;
    if (typeof id === "string") return id;
  }
  return undefined;
}

/** Parse Toshl `Link` header and return path+query for `rel="next"`. */
export function parseNextEntriesPath(linkHeader: string | undefined): string | null {
  if (!linkHeader) return null;
  for (const segment of linkHeader.split(",")) {
    if (!/rel="next"/i.test(segment)) continue;
    const m = segment.match(/<([^>]+)>/);
    if (!m) continue;
    const href = m[1].trim();
    try {
      const url = href.startsWith("http") ? new URL(href) : new URL(href, BASE_URL);
      return `${url.pathname.replace(/^\/?/, "/")}${url.search}`;
    } catch {
      return null;
    }
  }
  return null;
}

class ToshlClient {
  private api: AxiosInstance;
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private isDemo: boolean;

  constructor() {
    const { apiKey, forceRefreshCache, demoData } = getPreferenceValues();
    this.isDemo = demoData;

    if (forceRefreshCache) {
      this.cache.clear();
    }

    this.api = axios.create({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
      },
    });

    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error.response?.status;
        const body = error.response?.data;
        const message =
          (typeof body?.error === "string" && body.error) ||
          (typeof body?.message === "string" && body.message) ||
          error.message;

        let title = "API Error";
        if (status === 401) title = "Invalid API Key";
        else if (status === 403) title = "Forbidden";
        else if (status === 404) title = "Not Found";
        else if (status === 400) title = "Bad Request";
        else if (status === 409) title = "Conflict — refresh and retry";
        else if (status === 429) title = "Rate limited";

        const remaining = error.response?.headers?.["x-ratelimit-remaining"];
        const suffix = status === 429 && remaining !== undefined ? ` (${remaining} requests left)` : "";

        showToast({
          style: Toast.Style.Failure,
          title,
          message: `${message}${suffix}`,
        });
        return Promise.reject(error);
      },
    );
  }

  /** Single page of entries (max `per_page`, default 200). */
  async getTransactions(params: EntryListParams = {}) {
    if (this.isDemo) return MOCK_TRANSACTIONS;
    try {
      const clean = cleanParams(params as Record<string, unknown>);
      const response = await this.api.get<Transaction[]>("/entries", { params: clean });
      return response.data;
    } catch (e) {
      console.error("Failed to get transactions", e);
      throw e;
    }
  }

  /**
   * Fetches all pages in range using `Link: rel="next"` until exhausted or `maxPages` reached.
   */
  async getAllTransactions(params: Omit<EntryListParams, "page"> = {}, options?: { maxPages?: number }) {
    if (this.isDemo) return [...MOCK_TRANSACTIONS];
    const maxPages = options?.maxPages ?? 40;
    const base = cleanParams({ ...params, per_page: params.per_page ?? 200 } as Record<string, unknown>);
    const out: Transaction[] = [];

    let response = await this.api.get<Transaction[]>("/entries", { params: base });
    out.push(...response.data);

    let nextPath = parseNextEntriesPath(response.headers["link"] as string | undefined);
    let pages = 1;

    while (nextPath && pages < maxPages) {
      response = await this.api.get<Transaction[]>(nextPath);
      out.push(...response.data);
      nextPath = parseNextEntriesPath(response.headers["link"] as string | undefined);
      pages++;
    }

    return out;
  }

  async addTransaction(transaction: TransactionInput) {
    if (this.isDemo) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return MOCK_TRANSACTIONS[0];
    }
    try {
      const response = await this.api.post<Transaction | Record<string, never>>("/entries", transaction);
      const id = createdResourceId(response, "entries");
      if (id) {
        const { data } = await this.api.get<Transaction>(`/entries/${id}`);
        return data;
      }
      if (response.data && typeof response.data === "object" && "id" in response.data) {
        return response.data as Transaction;
      }
      throw new Error("addTransaction: missing entry id (no Location header or body)");
    } catch (e) {
      console.error("Failed to add transaction", e);
      throw e;
    }
  }

  async addTransfer(transfer: TransferInput) {
    if (this.isDemo) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return MOCK_TRANSACTIONS[0];
    }
    try {
      const createBody = { ...transfer } as Record<string, unknown>;
      delete createBody.modified;
      delete createBody.repeat;
      const response = await this.api.post<Transaction | Record<string, never>>("/entries", createBody);
      const id = createdResourceId(response, "entries");
      if (id) {
        const { data } = await this.api.get<Transaction>(`/entries/${id}`);
        return data;
      }
      if (response.data && typeof response.data === "object" && "id" in response.data) {
        return response.data as Transaction;
      }
      throw new Error("addTransfer: missing entry id (no Location header or body)");
    } catch (e) {
      console.error("Failed to add transfer", e);
      throw e;
    }
  }

  async updateTransaction(id: string, transaction: TransactionInput, mode?: "one" | "tail" | "all") {
    if (this.isDemo) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return MOCK_TRANSACTIONS[0];
    }
    try {
      const params = mode ? { update: mode } : {};
      const response = await this.api.put<Transaction>(`/entries/${id}`, transaction, { params });
      return response.data;
    } catch (e: unknown) {
      const error = e as { response?: { data?: unknown; status?: number } };
      console.error("Failed to update transaction:", {
        status: error.response?.status,
        data: error.response?.data,
        payload: transaction,
      });
      throw e;
    }
  }

  async updateTransfer(id: string, transfer: TransferInput, mode?: "one" | "tail" | "all") {
    if (this.isDemo) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return MOCK_TRANSACTIONS[0];
    }
    if (!transfer.modified) {
      throw new Error("Transfer update requires `modified` from the existing entry");
    }
    const params = mode ? { update: mode } : {};
    const response = await this.api.put<Transaction>(`/entries/${id}`, transfer, { params });
    return response.data;
  }

  async getEntry(id: string) {
    if (this.isDemo) return MOCK_TRANSACTIONS.find((t) => t.id === id) || MOCK_TRANSACTIONS[0];
    const { data } = await this.api.get<Transaction>(`/entries/${id}`);
    return data;
  }

  async deleteTransaction(id: string, mode?: "one" | "tail" | "all") {
    if (this.isDemo) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return;
    }
    try {
      const params = mode ? { delete: mode } : {};
      await this.api.delete(`/entries/${id}`, { params });
    } catch (e) {
      console.error("Failed to delete transaction", e);
      throw e;
    }
  }

  /** Clears list caches for `/budgets?…` (keys `budgets:…`). */
  private invalidateBudgetCaches() {
    for (const key of [...this.cache.keys()]) {
      if (key.startsWith("budgets:")) this.cache.delete(key);
    }
  }

  invalidateMetadataCache(which?: "categories" | "tags" | "accounts" | "currencies" | "all") {
    if (!which || which === "all") {
      this.cache.delete("categories");
      this.cache.delete("tags");
      this.cache.delete("accounts");
      this.cache.delete("currencies");
      this.cache.delete("me");
      this.invalidateBudgetCaches();
      for (const key of [...this.cache.keys()]) {
        if (key.startsWith("planning:")) this.cache.delete(key);
      }
      return;
    }
    this.cache.delete(which);
  }

  private getCacheEntry(key: string): CacheEntry<unknown> | undefined {
    return this.cache.get(key);
  }

  private setCache<T>(key: string, data: T, etag?: string, lastModified?: string): void {
    this.cache.set(key, { data, timestamp: Date.now(), etag, lastModified });
  }

  private async fetchWithCache<T>(
    cacheKey: string,
    endpoint: string,
    params: Record<string, unknown> = {},
    transform?: (data: unknown) => T,
  ): Promise<T> {
    const cached = this.getCacheEntry(cacheKey);

    const headers: Record<string, string> = {};
    if (cached?.etag) headers["If-None-Match"] = cached.etag;
    if (cached?.lastModified) headers["If-Modified-Since"] = cached.lastModified;

    try {
      const response = await this.api.get(endpoint, { params, headers });
      const etag = response.headers["etag"] as string | undefined;
      const lastModified = response.headers["last-modified"] as string | undefined;
      const data = transform ? transform(response.data) : (response.data as T);
      this.setCache(cacheKey, data, etag, lastModified);
      return data;
    } catch (error) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 304 && cached) {
        this.setCache(cacheKey, cached.data as T, cached.etag, cached.lastModified);
        return cached.data as T;
      }
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.warn(`Using cached data for ${cacheKey} due to API error`);
        return cached.data as T;
      }
      throw error;
    }
  }

  async getCategories(params: { page?: number; per_page?: number } = { per_page: 500 }) {
    if (this.isDemo) return MOCK_CATEGORIES;
    try {
      return await this.fetchWithCache<Category[]>("categories", "/categories", params, (data) =>
        (data as Category[]).filter((c) => !c.deleted),
      );
    } catch (e) {
      console.error("Failed to get categories", e);
      throw e;
    }
  }

  async createCategory(input: CategoryCreateInput) {
    if (this.isDemo) return MOCK_CATEGORIES[0];
    const response = await this.api.post<Category | Record<string, never>>("/categories", input);
    this.invalidateMetadataCache("categories");
    const id = createdResourceId(response, "categories");
    if (id) {
      const { data } = await this.api.get<Category>(`/categories/${id}`);
      return data;
    }
    if (response.data && typeof response.data === "object" && "id" in response.data) {
      return response.data as Category;
    }
    throw new Error("createCategory: missing id from API");
  }

  async updateCategory(input: CategoryUpdateInput) {
    if (this.isDemo) return MOCK_CATEGORIES[0];
    const { id, ...body } = input;
    const { data } = await this.api.put<Category>(`/categories/${id}`, { id, ...body });
    this.invalidateMetadataCache("categories");
    return data;
  }

  async deleteCategory(id: string) {
    if (this.isDemo) return;
    await this.api.delete(`/categories/${id}`);
    this.invalidateMetadataCache("categories");
  }

  async getTags(params: { page?: number; per_page?: number } = { per_page: 500 }) {
    if (this.isDemo) return MOCK_TAGS;
    try {
      return await this.fetchWithCache<Tag[]>("tags", "/tags", params, (data) =>
        (data as Tag[]).filter((t) => !t.deleted),
      );
    } catch (e) {
      console.error("Failed to get tags", e);
      throw e;
    }
  }

  async createTag(input: TagCreateInput) {
    if (this.isDemo) return MOCK_TAGS[0];
    const response = await this.api.post<Tag | Record<string, never>>("/tags", input);
    this.invalidateMetadataCache("tags");
    const id = createdResourceId(response, "tags");
    if (id) {
      const { data } = await this.api.get<Tag>(`/tags/${id}`);
      return data;
    }
    if (response.data && typeof response.data === "object" && "id" in response.data) {
      return response.data as Tag;
    }
    throw new Error("createTag: missing id from API");
  }

  async updateTag(input: TagUpdateInput) {
    if (this.isDemo) return MOCK_TAGS[0];
    const { id, ...body } = input;
    const { data } = await this.api.put<Tag>(`/tags/${id}`, { id, ...body });
    this.invalidateMetadataCache("tags");
    return data;
  }

  async deleteTag(id: string) {
    if (this.isDemo) return;
    await this.api.delete(`/tags/${id}`);
    this.invalidateMetadataCache("tags");
  }

  async getAccounts(params: { page?: number; per_page?: number } = { per_page: 100 }) {
    if (this.isDemo) return MOCK_ACCOUNTS;
    try {
      return await this.fetchWithCache<Account[]>("accounts", "/accounts", params, (data) =>
        (data as Account[]).sort((a, b) => a.order - b.order),
      );
    } catch (e) {
      console.error("Failed to get accounts", e);
      throw e;
    }
  }

  async createAccount(input: AccountCreateInput) {
    if (this.isDemo) return MOCK_ACCOUNTS[0];
    const response = await this.api.post<Account | Record<string, never>>("/accounts", input);
    this.invalidateMetadataCache("accounts");
    const id = createdResourceId(response, "accounts");
    if (id) {
      const { data } = await this.api.get<Account>(`/accounts/${id}`);
      return data;
    }
    if (response.data && typeof response.data === "object" && "id" in response.data) {
      return response.data as Account;
    }
    throw new Error("createAccount: missing id from API");
  }

  async updateAccount(input: AccountUpdateInput) {
    if (this.isDemo) return MOCK_ACCOUNTS[0];
    const { id, ...body } = input;
    const { data } = await this.api.put<Account>(`/accounts/${id}`, { id, ...body });
    this.invalidateMetadataCache("accounts");
    return data;
  }

  async deleteAccount(id: string) {
    if (this.isDemo) return;
    await this.api.delete(`/accounts/${id}`);
    this.invalidateMetadataCache("accounts");
  }

  async getCurrencies() {
    if (this.isDemo) return [];
    try {
      return await this.fetchWithCache<Currency[]>("currencies", "/currencies", {}, (data) => {
        const currencyMap = data as { [key: string]: Omit<Currency, "code"> };
        return Object.entries(currencyMap).map(([code, details]) => ({
          ...details,
          code,
        }));
      });
    } catch (e) {
      console.error("Failed to get currencies", e);
      throw e;
    }
  }

  async getMe() {
    if (this.isDemo) {
      return {
        id: "demo",
        email: "demo@example.com",
        first_name: "Demo",
        last_name: "User",
        currency: { main: "USD" },
        locale: "en_US",
        timezone: "UTC",
        country: "US",
        start_day: 1,
        limits: { accounts: true, budgets: true, images: true, planning: true, locations: true },
      };
    }
    try {
      return await this.fetchWithCache<Record<string, unknown>>("me", "/me", {});
    } catch (e) {
      console.error("Failed to get me", e);
      throw e;
    }
  }

  async getDefaultCurrency(): Promise<string> {
    if (this.isDemo) return "USD";
    try {
      const me = await this.getMe();
      const main = (me as { currency?: { main?: string } }).currency?.main;
      return typeof main === "string" && main.length > 0 ? main : "USD";
    } catch (e) {
      console.error("Failed to get default currency", e);
      return "USD";
    }
  }

  async getBudgets(params: { from?: string; to?: string; page?: number; per_page?: number } = {}) {
    if (this.isDemo) return MOCK_BUDGETS;
    const clean = cleanParams(params as Record<string, unknown>);
    const cacheKey = `budgets:${JSON.stringify(clean)}`;
    try {
      return await this.fetchWithCache<Budget[]>(cacheKey, "/budgets", clean, (data) =>
        (data as Budget[]).filter((b) => !b.deleted),
      );
    } catch (e) {
      console.error("Failed to get budgets", e);
      throw e;
    }
  }

  async createBudget(input: BudgetCreateInput) {
    if (this.isDemo) return MOCK_BUDGETS[0];
    const response = await this.api.post<Budget | Record<string, never>>("/budgets", input);
    this.invalidateBudgetCaches();
    const id = createdResourceId(response, "budgets");
    if (id) {
      const { data } = await this.api.get<Budget>(`/budgets/${id}`);
      return data;
    }
    if (response.data && typeof response.data === "object" && "id" in response.data) {
      return response.data as Budget;
    }
    throw new Error("createBudget: missing id from API");
  }

  async updateBudget(input: BudgetUpdateInput, mode?: "one" | "tail" | "all") {
    if (this.isDemo) return MOCK_BUDGETS[0];
    const { id, ...body } = input;
    const params = mode ? { update: mode } : {};
    const { data } = await this.api.put<Budget>(`/budgets/${id}`, { id, ...body }, { params });
    this.invalidateBudgetCaches();
    return data;
  }

  async deleteBudget(id: string) {
    if (this.isDemo) return;
    await this.api.delete(`/budgets/${id}`);
    this.invalidateBudgetCaches();
  }

  async getPlanning(params: { from: string; to: string }) {
    if (this.isDemo) return MOCK_PLANNING;
    const clean = cleanParams(params as Record<string, unknown>);
    const cacheKey = `planning:${params.from}:${params.to}`;
    try {
      return await this.fetchWithCache<Planning>(cacheKey, "/planning", clean);
    } catch (e) {
      console.error("Failed to get planning", e);
      throw e;
    }
  }

  /** Aggregated sums per tag for a period (`GET /tags/sums`). `currency` is required by the API (ISO code). */
  async getTagSums(params: { from: string; to: string; currency: string; type?: string }) {
    if (this.isDemo) return [];
    const { data } = await this.api.get<unknown>("/tags/sums", {
      params: cleanParams(params as Record<string, unknown>),
    });
    return data;
  }

  /** Saved entry locations (`GET /entries/locations`). */
  async getEntryLocations(params: { from?: string; to?: string; page?: number; per_page?: number } = {}) {
    if (this.isDemo) return [];
    const { data } = await this.api.get<unknown>("/entries/locations", {
      params: cleanParams(params as Record<string, unknown>),
    });
    return data;
  }
}

export const toshl = new ToshlClient();
