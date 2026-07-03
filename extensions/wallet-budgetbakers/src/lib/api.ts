import { getPreferenceValues } from "@raycast/api";

const BASE_URL = "https://rest.budgetbakers.com/wallet/v1/api";

interface Prefs {
  apiToken: string;
}

export type PaymentType =
  | "cash"
  | "debit_card"
  | "credit_card"
  | "transfer"
  | "voucher"
  | "mobile_payment"
  | "web_payment";

export const PAYMENT_TYPES: { value: PaymentType; title: string }[] = [
  { value: "cash", title: "Cash" },
  { value: "debit_card", title: "Debit Card" },
  { value: "credit_card", title: "Credit Card" },
  { value: "transfer", title: "Transfer" },
  { value: "voucher", title: "Voucher" },
  { value: "mobile_payment", title: "Mobile Payment" },
  { value: "web_payment", title: "Web Payment" },
];

export interface Money {
  amount?: number | string;
  value?: number | string;
  currencyCode?: string;
  currency?: string;
}

export interface CategoryEmbed {
  id?: string;
  name?: string;
  color?: string;
}

export interface LabelEmbed {
  id?: string;
  name?: string;
  color?: string;
}

export interface WalletRecord {
  id: string;
  accountId?: string;
  accountName?: string;
  accountIsBankSync?: boolean | null;
  amount?: Money | number;
  convertedAmount?: Money | number;
  category?: CategoryEmbed;
  counterParty?: string;
  labels?: LabelEmbed[];
  note?: string;
  paymentType?: PaymentType;
  recordDate?: string;
  recordState?: string;
  recordType?: "income" | "expense";
  transfer?: unknown;
  createdAt?: string;
  updatedAt?: string;
}

export interface WalletAccount {
  id: string;
  name?: string;
  accountType?: string;
  balance?: Money | { current?: Money; available?: Money } | number;
  currencyCode?: string;
  color?: string;
  archived?: boolean;
  excludeFromStats?: boolean;
  isBankSync?: boolean;
  initialBalance?: Money | number;
  recordStats?: unknown;
}

export interface WalletCategory {
  id: string;
  name?: string;
  color?: string;
  parentId?: string;
  archived?: boolean;
  enabled?: boolean;
  customCategory?: boolean;
  cardinality?: string;
  group?: { id?: string; name?: string } | string;
}

export interface WalletLabel {
  id: string;
  name?: string;
  color?: string;
  archived?: boolean;
}

export interface WalletBudget {
  id: string;
  name?: string;
  type?: string;
  currencyCode?: string;
  limit?: Money | number;
  closed?: boolean;
  categoryIds?: string[];
  accountIds?: string[];
  [key: string]: unknown;
}

export interface NewRecord {
  accountId: string;
  amount: number;
  recordDate: string;
  paymentType?: PaymentType;
  categoryId?: string;
  recordState?: string;
  labelIds?: string[];
  note?: string;
  counterParty?: string;
}

export interface RecordPatch {
  id: string;
  accountId?: string;
  amount?: number;
  recordDate?: string;
  paymentType?: PaymentType;
  categoryId?: string;
  recordState?: string;
  labelIds?: string[];
  note?: string;
  counterParty?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { apiToken } = getPreferenceValues<Prefs>();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiToken.trim()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let message = body;
    try {
      const parsed = JSON.parse(body);
      message = parsed.message ?? parsed.error ?? body;
    } catch {
      // keep raw body
    }
    if (res.status === 401) {
      throw new Error(
        "Invalid or expired token. Check the API Token in the extension preferences (⌘ ,).",
      );
    }
    if (res.status === 429) {
      throw new Error(
        "Rate limit reached (300 requests/hour). Try again later.",
      );
    }
    throw new Error(`Error ${res.status}: ${message || res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

function extractItems<T>(json: unknown): T[] {
  if (Array.isArray(json)) return json as T[];
  if (json && typeof json === "object") {
    const obj = json as Record<string, unknown>;
    for (const key of ["items", "data", "records", "results", "content"]) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
    // Some endpoints wrap the list under their entity name (accounts, categories…):
    // fall back to the first array property found.
    for (const value of Object.values(obj)) {
      if (Array.isArray(value)) return value as T[];
    }
  }
  return [];
}

function nextOffsetOf(json: unknown): number | undefined {
  if (json && typeof json === "object") {
    const value = (json as Record<string, unknown>).nextOffset;
    if (typeof value === "number") return value;
  }
  return undefined;
}

export interface RecordFilters {
  /** e.g. "gte.2026-07-01" */
  recordDate?: string[];
  note?: string;
  counterParty?: string;
  limit?: number;
  offset?: number;
}

export async function getRecords(
  filters: RecordFilters = {},
): Promise<{ items: WalletRecord[]; nextOffset?: number }> {
  const params = new URLSearchParams();
  params.set("limit", String(filters.limit ?? 200));
  params.set("offset", String(filters.offset ?? 0));
  for (const dateFilter of filters.recordDate ?? [])
    params.append("recordDate", dateFilter);
  if (filters.note) params.set("note", `contains-i.${filters.note}`);
  if (filters.counterParty)
    params.set("counterParty", `contains-i.${filters.counterParty}`);
  const json = await request<unknown>(`/records?${params.toString()}`);
  return {
    items: extractItems<WalletRecord>(json),
    nextOffset: nextOffsetOf(json),
  };
}

/** Fetches all pages of records matching the filters (bounded by maxItems). */
export async function getAllRecords(
  filters: RecordFilters = {},
  maxItems = 1000,
): Promise<WalletRecord[]> {
  const all: WalletRecord[] = [];
  let offset = filters.offset ?? 0;
  while (all.length < maxItems) {
    const page = await getRecords({ ...filters, limit: 200, offset });
    all.push(...page.items);
    if (page.nextOffset === undefined || page.items.length === 0) break;
    offset = page.nextOffset;
  }
  return all.slice(0, maxItems);
}

export async function createRecords(records: NewRecord[]): Promise<unknown> {
  return request("/records", { method: "POST", body: JSON.stringify(records) });
}

export async function patchRecords(patches: RecordPatch[]): Promise<unknown> {
  return request("/records", {
    method: "PATCH",
    body: JSON.stringify(patches),
  });
}

export async function deleteRecord(id: string): Promise<unknown> {
  return request(`/records?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function getAccounts(): Promise<WalletAccount[]> {
  return extractItems<WalletAccount>(await request<unknown>("/accounts"));
}

export async function createAccount(account: {
  name: string;
  accountType: string;
  currencyCode: string;
  initialBalance: number;
  color?: string;
}): Promise<unknown> {
  return request("/accounts", {
    method: "POST",
    body: JSON.stringify(account),
  });
}

export async function patchAccounts(
  patches: Array<{ id: string } & Partial<WalletAccount>>,
): Promise<unknown> {
  return request("/accounts", {
    method: "PATCH",
    body: JSON.stringify(patches),
  });
}

export async function getCategories(): Promise<WalletCategory[]> {
  return extractItems<WalletCategory>(await request<unknown>("/categories"));
}

export async function getLabels(): Promise<WalletLabel[]> {
  return extractItems<WalletLabel>(await request<unknown>("/labels"));
}

export async function getBudgets(): Promise<WalletBudget[]> {
  return extractItems<WalletBudget>(await request<unknown>("/budgets"));
}

export async function createBudget(budget: {
  name: string;
  currencyCode: string;
  type: string;
  limit: number;
  startDate?: string;
  endDate?: string;
  categoryIds?: string[];
}): Promise<unknown> {
  return request("/budgets", { method: "POST", body: JSON.stringify(budget) });
}
