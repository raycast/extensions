import { LocalStorage } from "@raycast/api";
import {
  getDemoAccounts,
  getDemoBalancesByAccount,
  getDemoCards,
  getDemoMandates,
  getDemoPayees,
  getDemoSpacesByAccount,
  getDemoTransactions,
} from "./mock-data";
import { getResolvedPreferences } from "./preferences";
import {
  AccountWithBalance,
  ApiErrorData,
  MinorUnitAmount,
  StarlingAccount,
  StarlingBalance,
  StarlingCard,
  StarlingCardControl,
  StarlingDashboard,
  StarlingFeedItem,
  StarlingMandate,
  StarlingPayee,
  StarlingSpace,
} from "./types";

const JSON_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
};
const DASHBOARD_BALANCE_CACHE_KEY = "starling.dashboard.balance-cache.v1";

export const STARLING_DEVELOPER_PORTAL_URL = "https://developer.starlingbank.com";
export const STARLING_PERSONAL_ACCESS_DOCS_URL =
  "https://developer.starlingbank.com/docs#accessing-your-own-starling-bank-account";

export class StarlingApiError extends Error {
  readonly status: number;
  readonly details?: ApiErrorData | string;

  constructor(message: string, status: number, details?: ApiErrorData | string) {
    super(message);
    this.name = "StarlingApiError";
    this.status = status;
    this.details = details;
  }
}

function isDemoMode(): boolean {
  return getResolvedPreferences().useDemoData;
}

function toRecord(value: unknown): Record<string, unknown> {
  return (value ?? {}) as Record<string, unknown>;
}

function getFirstDefined(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return record[key];
    }
  }
  return undefined;
}

function getArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function firstArrayFromKeys<T>(container: unknown, keys: string[]): T[] {
  const record = toRecord(container);
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value as T[];
    }
  }
  return [];
}

function accountCategory(account: StarlingAccount): string | undefined {
  return account.defaultCategory ?? account.defaultCategoryUid;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(retryAfterHeader: string | null): number | undefined {
  if (!retryAfterHeader) return undefined;
  const seconds = Number.parseFloat(retryAfterHeader);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000);
  }
  return undefined;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(1, Math.round(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${totalSeconds}s`;
}

function normalizeMinorUnitAmount(raw: unknown, fallbackCurrency?: string): MinorUnitAmount | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }

  if (typeof raw === "number") {
    return {
      currency: fallbackCurrency,
      minorUnits: raw,
    };
  }

  const record = toRecord(raw);
  const nestedAmount = getFirstDefined(record, ["amount", "value"]);
  if (nestedAmount !== undefined && nestedAmount !== raw) {
    const parsedNested = normalizeMinorUnitAmount(nestedAmount, fallbackCurrency);
    if (parsedNested) return parsedNested;
  }

  const minorUnitsCandidate = getFirstDefined(record, ["minorUnits", "minor_units", "minorUnit", "minor_unit"]);
  const currencyCandidate = getFirstDefined(record, ["currency", "currencyCode", "currency_code", "isoCurrency"]);

  if (minorUnitsCandidate !== undefined) {
    const minorUnits =
      typeof minorUnitsCandidate === "number" ? minorUnitsCandidate : Number(String(minorUnitsCandidate));
    if (Number.isFinite(minorUnits)) {
      return {
        currency: typeof currencyCandidate === "string" ? currencyCandidate : fallbackCurrency,
        minorUnits,
      };
    }
  }

  return undefined;
}

function normalizeAccount(raw: unknown): StarlingAccount | undefined {
  const record = toRecord(raw);
  const nestedAccount = getFirstDefined(record, ["account", "bankAccount", "accountDetails", "account_detail"]);
  const source = nestedAccount && typeof nestedAccount === "object" ? toRecord(nestedAccount) : record;

  const accountUid = getFirstDefined(source, ["accountUid", "account_uid", "uid", "id"]);
  if (typeof accountUid !== "string" || accountUid.length === 0) {
    return undefined;
  }

  const defaultCategory = getFirstDefined(source, ["defaultCategory", "default_category", "categoryUid"]);
  const defaultCategoryUid = getFirstDefined(source, ["defaultCategoryUid", "default_category_uid", "category_uid"]);

  return {
    accountUid,
    accountType:
      typeof getFirstDefined(source, ["accountType", "account_type", "type"]) === "string"
        ? String(getFirstDefined(source, ["accountType", "account_type", "type"]))
        : undefined,
    name:
      typeof getFirstDefined(source, ["name", "accountName", "displayName"]) === "string"
        ? String(getFirstDefined(source, ["name", "accountName", "displayName"]))
        : undefined,
    currency:
      typeof getFirstDefined(source, ["currency", "currencyCode", "currency_code"]) === "string"
        ? String(getFirstDefined(source, ["currency", "currencyCode", "currency_code"]))
        : undefined,
    createdAt:
      typeof getFirstDefined(source, ["createdAt", "created_at"]) === "string"
        ? String(getFirstDefined(source, ["createdAt", "created_at"]))
        : undefined,
    defaultCategory: typeof defaultCategory === "string" ? defaultCategory : undefined,
    defaultCategoryUid: typeof defaultCategoryUid === "string" ? defaultCategoryUid : undefined,
  };
}

function normalizeBalance(raw: unknown, fallbackCurrency?: string): StarlingBalance {
  const record = toRecord(raw);

  return {
    clearedBalance: normalizeMinorUnitAmount(
      getFirstDefined(record, ["clearedBalance", "cleared_balance", "cleared"]),
      fallbackCurrency,
    ),
    effectiveBalance: normalizeMinorUnitAmount(
      getFirstDefined(record, ["effectiveBalance", "effective_balance", "availableToSpend", "available_to_spend"]),
      fallbackCurrency,
    ),
    pendingTransactions: normalizeMinorUnitAmount(
      getFirstDefined(record, ["pendingTransactions", "pending_transactions", "pending"]),
      fallbackCurrency,
    ),
    acceptedOverdraft: normalizeMinorUnitAmount(
      getFirstDefined(record, ["acceptedOverdraft", "accepted_overdraft"]),
      fallbackCurrency,
    ),
    amount: normalizeMinorUnitAmount(getFirstDefined(record, ["amount", "balance"]), fallbackCurrency),
    totalClearedBalance: normalizeMinorUnitAmount(
      getFirstDefined(record, ["totalClearedBalance", "total_cleared_balance"]),
      fallbackCurrency,
    ),
    totalEffectiveBalance: normalizeMinorUnitAmount(
      getFirstDefined(record, ["totalEffectiveBalance", "total_effective_balance"]),
      fallbackCurrency,
    ),
  };
}

function normalizeBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return undefined;
}

function normalizeCard(raw: unknown): StarlingCard | undefined {
  const record = toRecord(raw);

  const cardUidValue = getFirstDefined(record, ["cardUid", "card_uid", "uid", "id"]);
  const cardUid = typeof cardUidValue === "string" ? cardUidValue : undefined;
  if (!cardUid || cardUid.length === 0) {
    return undefined;
  }

  const publicToken = getFirstDefined(record, ["publicToken", "public_token", "token"]);
  const last4 = getFirstDefined(record, [
    "last4",
    "lastFour",
    "lastFourDigits",
    "last4Digits",
    "lastDigits",
    "last_digits",
    "panLast4",
    "pan_last4",
    "cardLast4",
    "card_last4",
    "endOfCardNumber",
    "end_of_card_number",
  ]);
  const name = getFirstDefined(record, ["name", "cardName", "displayName", "friendlyName", "label"]);
  const enabled = getFirstDefined(record, ["enabled", "isEnabled", "active"]);
  const cardAssociation = getFirstDefined(record, [
    "cardAssociation",
    "card_association",
    "network",
    "brand",
    "scheme",
    "cardNetwork",
    "card_network",
  ]);
  const cardType = getFirstDefined(record, [
    "cardType",
    "card_type",
    "type",
    "cardProductType",
    "card_product_type",
    "productType",
  ]);
  const cardStatus = getFirstDefined(record, ["cardStatus", "card_status", "status", "state"]);
  const walletNotificationEnabled = getFirstDefined(record, [
    "walletNotificationEnabled",
    "wallet_notification_enabled",
    "walletNotificationsEnabled",
  ]);
  const posEnabled = getFirstDefined(record, ["posEnabled", "pos_enabled"]);
  const atmEnabled = getFirstDefined(record, ["atmEnabled", "atm_enabled"]);
  const onlineEnabled = getFirstDefined(record, ["onlineEnabled", "online_enabled"]);
  const mobileWalletEnabled = getFirstDefined(record, ["mobileWalletEnabled", "mobile_wallet_enabled"]);
  const gamblingEnabled = getFirstDefined(record, ["gamblingEnabled", "gambling_enabled"]);
  const magStripeEnabled = getFirstDefined(record, ["magStripeEnabled", "mag_stripe_enabled"]);
  const cancelled = getFirstDefined(record, ["cancelled", "canceled", "isCancelled", "isCanceled"]);
  const activationRequested = getFirstDefined(record, ["activationRequested", "activation_requested"]);
  const activated = getFirstDefined(record, ["activated", "isActivated"]);
  const cardAssociationUid = getFirstDefined(record, ["cardAssociationUid", "card_association_uid", "associationUid"]);
  const currencyFlags = getFirstDefined(record, ["currencyFlags", "currency_flags"]);
  const createdAt = getFirstDefined(record, ["createdAt", "created_at"]);
  const updatedAt = getFirstDefined(record, ["updatedAt", "updated_at"]);

  const normalizedCurrencyFlags = Array.isArray(currencyFlags)
    ? currencyFlags.map((flag) => {
        const flagRecord = toRecord(flag);
        const currency = getFirstDefined(flagRecord, ["currency", "code"]);
        const enabled = getFirstDefined(flagRecord, ["enabled", "isEnabled", "active"]);
        return {
          currency: typeof currency === "string" ? currency : undefined,
          enabled: normalizeBoolean(enabled),
        };
      })
    : undefined;

  return {
    cardUid,
    uid: cardUid,
    publicToken: typeof publicToken === "string" ? publicToken : undefined,
    last4: typeof last4 === "string" ? last4 : undefined,
    name: typeof name === "string" ? name : undefined,
    enabled: normalizeBoolean(enabled),
    posEnabled: normalizeBoolean(posEnabled),
    atmEnabled: normalizeBoolean(atmEnabled),
    onlineEnabled: normalizeBoolean(onlineEnabled),
    mobileWalletEnabled: normalizeBoolean(mobileWalletEnabled),
    gamblingEnabled: normalizeBoolean(gamblingEnabled),
    magStripeEnabled: normalizeBoolean(magStripeEnabled),
    cancelled: normalizeBoolean(cancelled),
    activationRequested: normalizeBoolean(activationRequested),
    activated: normalizeBoolean(activated),
    cardAssociation: typeof cardAssociation === "string" ? cardAssociation : undefined,
    cardAssociationUid: typeof cardAssociationUid === "string" ? cardAssociationUid : undefined,
    cardType: typeof cardType === "string" ? cardType : undefined,
    cardStatus: typeof cardStatus === "string" ? cardStatus : undefined,
    walletNotificationEnabled: normalizeBoolean(walletNotificationEnabled),
    currencyFlags: normalizedCurrencyFlags,
    createdAt: typeof createdAt === "string" ? createdAt : undefined,
    updatedAt: typeof updatedAt === "string" ? updatedAt : undefined,
    raw: record,
  };
}

function normalizeSpace(raw: unknown): StarlingSpace | undefined {
  const record = toRecord(raw);

  const spaceUid = getFirstDefined(record, ["spaceUid", "space_uid", "uid", "id"]);
  const savingsGoalUid = getFirstDefined(record, ["savingsGoalUid", "savings_goal_uid", "goalUid", "goal_uid"]);
  const categoryUid = getFirstDefined(record, ["categoryUid", "category_uid"]);
  const name = getFirstDefined(record, ["name", "goalName", "goal_name", "title"]);
  const goalType = getFirstDefined(record, ["goalType", "goal_type", "spaceType", "space_type", "type"]);
  const state = getFirstDefined(record, ["state", "status"]);
  const balance = getFirstDefined(record, [
    "balance",
    "totalSaved",
    "total_saved",
    "amount",
    "effectiveBalance",
    "effective_balance",
  ]);

  const normalized: StarlingSpace = {
    spaceUid: typeof spaceUid === "string" ? spaceUid : undefined,
    savingsGoalUid: typeof savingsGoalUid === "string" ? savingsGoalUid : undefined,
    categoryUid: typeof categoryUid === "string" ? categoryUid : undefined,
    name: typeof name === "string" ? name : undefined,
    goalType: typeof goalType === "string" ? goalType : undefined,
    state: typeof state === "string" ? state : undefined,
    balance: normalizeMinorUnitAmount(balance),
  };

  if (!normalized.spaceUid && !normalized.savingsGoalUid && !normalized.categoryUid) {
    return undefined;
  }

  return normalized;
}

function normalizeMandate(raw: unknown): StarlingMandate | undefined {
  const record = toRecord(raw);
  const mandateUid = getFirstDefined(record, ["mandateUid", "mandate_uid", "directDebitMandateUid", "uid", "id"]);
  if (typeof mandateUid !== "string" || mandateUid.length === 0) {
    return undefined;
  }

  const reference = getFirstDefined(record, ["reference", "paymentReference", "payment_reference"]);
  const status = getFirstDefined(record, ["status", "state"]);
  const source = getFirstDefined(record, ["source"]);
  const created = getFirstDefined(record, ["created", "createdAt", "created_at"]);
  const originatorName = getFirstDefined(record, ["originatorName", "originator_name", "originator"]);

  return {
    mandateUid,
    reference: typeof reference === "string" ? reference : undefined,
    status: typeof status === "string" ? status : undefined,
    source: typeof source === "string" ? source : undefined,
    created: typeof created === "string" ? created : undefined,
    originatorName: typeof originatorName === "string" ? originatorName : undefined,
  };
}

function parseSpacesResponse(response: Record<string, unknown>): StarlingSpace[] {
  const merged = [
    ...firstArrayFromKeys<unknown>(response, ["spendingSpaces", "spendingSpaceList"]),
    ...firstArrayFromKeys<unknown>(response, ["savingsGoalList", "savingsGoals", "savingsSpaces"]),
    ...firstArrayFromKeys<unknown>(response, ["spaces", "spaceList", "items"]),
    ...firstArrayFromKeys<unknown>(response, ["categories", "categoryList"]),
  ];

  return merged.map((item) => normalizeSpace(item)).filter((item): item is StarlingSpace => item !== undefined);
}

async function request<T>(
  path: string,
  options?: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    query?: Record<string, string | number | undefined>;
    body?: unknown;
    tokenOverride?: string;
  },
): Promise<T> {
  const prefs = getResolvedPreferences();
  const token = options?.tokenOverride ?? prefs.personalAccessToken;

  if (!token) {
    throw new StarlingApiError("Missing Starling personal access token", 401);
  }

  const url = new URL(path, prefs.baseUrl);
  if (options?.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const method = options?.method ?? "GET";
  const maxRetries = method === "GET" ? 3 : 1;
  let lastError: StarlingApiError | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, {
      method,
      headers: {
        ...JSON_HEADERS,
        Authorization: `Bearer ${token}`,
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const isJson = contentType.includes("application/json");
    const parsedBody = isJson ? await response.json().catch(() => undefined) : await response.text().catch(() => "");

    if (response.ok) {
      if (response.status === 204 || parsedBody === undefined || parsedBody === "") {
        return {} as T;
      }
      return parsedBody as T;
    }

    const data = parsedBody as ApiErrorData | string | undefined;
    const errorMessage =
      (typeof data === "object" && data && (data.error_description || data.message || data.error)) ||
      (typeof data === "string" && data.length > 0 ? data : `Request failed with status ${response.status}`);
    const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
    if (response.status === 429) {
      const suffix = retryAfterMs ? ` Retry after ${formatDuration(retryAfterMs)}.` : "";
      throw new StarlingApiError(`Rate limit reached.${suffix}`, 429, data);
    }

    lastError = new StarlingApiError(errorMessage, response.status, data);

    const canRetry = method === "GET" && response.status >= 500 && attempt < maxRetries - 1;
    if (!canRetry) {
      throw lastError;
    }

    const backoffMs = retryAfterMs ?? 300 * 2 ** attempt;
    await sleep(backoffMs);
  }

  throw lastError ?? new StarlingApiError("Unknown request error", 500);
}

export async function getAccounts(): Promise<StarlingAccount[]> {
  if (isDemoMode()) {
    return getDemoAccounts();
  }
  const response = await request<Record<string, unknown>>("/api/v2/accounts");
  const rawAccounts = firstArrayFromKeys<unknown>(response, ["accounts", "accountList", "items"]);
  return rawAccounts
    .map((item) => normalizeAccount(item))
    .filter((item): item is StarlingAccount => item !== undefined);
}

export async function getAccountBalance(accountUid: string, fallbackCurrency?: string): Promise<StarlingBalance> {
  if (isDemoMode()) {
    const defaults = getDemoBalancesByAccount()[accountUid];
    return {
      clearedBalance: { currency: fallbackCurrency ?? "GBP", minorUnits: defaults?.minorUnits ?? 0 },
      effectiveBalance: { currency: fallbackCurrency ?? "GBP", minorUnits: defaults?.minorUnits ?? 0 },
      totalClearedBalance: { currency: fallbackCurrency ?? "GBP", minorUnits: defaults?.minorUnits ?? 0 },
      totalEffectiveBalance: { currency: fallbackCurrency ?? "GBP", minorUnits: defaults?.minorUnits ?? 0 },
      pendingTransactions: { currency: fallbackCurrency ?? "GBP", minorUnits: defaults?.pendingMinorUnits ?? 0 },
    };
  }
  const response = await request<Record<string, unknown>>(`/api/v2/accounts/${accountUid}/balance`);
  return normalizeBalance(response, fallbackCurrency);
}

export async function getAccountHolder(): Promise<{ accountHolderUid?: string; accountHolderType?: string }> {
  if (isDemoMode()) {
    return { accountHolderUid: "demo-holder", accountHolderType: "PERSONAL" };
  }
  return request<{ accountHolderUid?: string; accountHolderType?: string }>("/api/v2/account-holder");
}

export async function getAccountHolderName(): Promise<string | undefined> {
  if (isDemoMode()) {
    return "Alex Parker";
  }
  const result = await request<Record<string, unknown>>("/api/v2/account-holder/name");
  if (typeof result.name === "string") return result.name;

  const first = firstArrayFromKeys<Record<string, unknown>>(result, ["accountHolderNames", "names"])[0];
  if (!first) return undefined;

  const parts = [first.title, first.firstName, first.middleName, first.lastName]
    .filter((value) => typeof value === "string" && value.length > 0)
    .join(" ");

  return parts || undefined;
}

export async function getDashboard(): Promise<StarlingDashboard> {
  const cachedBalances = await readDashboardBalanceCache();
  const [accounts, accountHolder, accountHolderName] = await Promise.all([
    getAccounts(),
    getAccountHolder().catch(() => undefined),
    getAccountHolderName().catch(() => undefined),
  ]);

  const refreshedBalanceCache: Record<string, StarlingBalance> = {};
  const withBalances: AccountWithBalance[] = [];

  // Keep balance calls below personal token limits and reduce transient 429s.
  for (const account of accounts) {
    try {
      const balance = await getAccountBalance(account.accountUid, account.currency);
      withBalances.push({ account, balance });
      refreshedBalanceCache[account.accountUid] = balance;
      await sleep(120);
    } catch {
      const cached = cachedBalances[account.accountUid];
      if (cached) {
        withBalances.push({ account, balance: cached });
      } else {
        withBalances.push({ account });
      }
    }
  }

  const mergedCache = {
    ...cachedBalances,
    ...refreshedBalanceCache,
  };
  await writeDashboardBalanceCache(mergedCache);

  return {
    accountHolder,
    accountHolderName,
    accounts: withBalances,
  };
}

async function readDashboardBalanceCache(): Promise<Record<string, StarlingBalance>> {
  try {
    const raw = await LocalStorage.getItem<string>(DASHBOARD_BALANCE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const normalized: Record<string, StarlingBalance> = {};

    for (const [accountUid, rawBalance] of Object.entries(parsed)) {
      try {
        normalized[accountUid] = normalizeBalance(rawBalance);
      } catch {
        // ignore malformed cached entries
      }
    }
    return normalized;
  } catch {
    return {};
  }
}

async function writeDashboardBalanceCache(cache: Record<string, StarlingBalance>): Promise<void> {
  try {
    await LocalStorage.setItem(DASHBOARD_BALANCE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // cache failures should never break command execution
  }
}

export function getDateWindow(days: number): { min: string; max: string } {
  const maxDate = new Date();
  const minDate = new Date();
  minDate.setDate(minDate.getDate() - days);
  return {
    min: minDate.toISOString(),
    max: maxDate.toISOString(),
  };
}

export async function getTransactionsForCategory(
  accountUid: string,
  categoryUid: string,
  minTimestamp: string,
  maxTimestamp: string,
): Promise<StarlingFeedItem[]> {
  if (isDemoMode()) {
    const min = new Date(minTimestamp).getTime();
    const max = new Date(maxTimestamp).getTime();
    return getDemoTransactions()
      .filter((record) => record.accountUid === accountUid && record.categoryUid === categoryUid)
      .map((record) => record.item)
      .filter((item) => {
        const value = new Date(item.transactionTime ?? item.settlementTime ?? 0).getTime();
        return Number.isFinite(value) && value >= min && value <= max;
      });
  }

  const response = await request<{ feedItems?: StarlingFeedItem[] }>(
    `/api/v2/feed/account/${accountUid}/category/${categoryUid}/transactions-between`,
    {
      query: {
        minTransactionTimestamp: minTimestamp,
        maxTransactionTimestamp: maxTimestamp,
      },
    },
  );

  return getArray<StarlingFeedItem>(response.feedItems);
}

export async function getTransactionsAcrossAccounts(options?: {
  lookbackDays?: number;
  maxTransactionsPerAccount?: number;
}): Promise<
  Array<{
    account: StarlingAccount;
    categoryUid: string;
    item: StarlingFeedItem;
  }>
> {
  const prefs = getResolvedPreferences();
  const lookbackDays = options?.lookbackDays ?? prefs.transactionLookbackDays;
  const { min, max } = getDateWindow(lookbackDays);

  return getTransactionsAcrossAccountsInWindow({
    minTimestamp: min,
    maxTimestamp: max,
    maxTransactionsPerAccount: options?.maxTransactionsPerAccount ?? prefs.maxTransactions,
  });
}

export async function getTransactionsAcrossAccountsInWindow(options: {
  minTimestamp: string;
  maxTimestamp: string;
  maxTransactionsPerAccount?: number;
}): Promise<
  Array<{
    account: StarlingAccount;
    categoryUid: string;
    item: StarlingFeedItem;
  }>
> {
  const prefs = getResolvedPreferences();
  const cap = options.maxTransactionsPerAccount ?? prefs.maxTransactions;

  const accounts = await getAccounts();

  const responses = await Promise.all(
    accounts.map(async (account) => {
      const categoryUid = accountCategory(account);
      if (!categoryUid) return [];

      try {
        const feedItems = await getTransactionsForCategory(
          account.accountUid,
          categoryUid,
          options.minTimestamp,
          options.maxTimestamp,
        );
        return feedItems.slice(0, cap).map((item) => ({ account, categoryUid, item }));
      } catch {
        return [];
      }
    }),
  );

  return responses.flat().sort((a, b) => {
    const aDate = new Date(a.item.transactionTime ?? a.item.settlementTime ?? 0).getTime();
    const bDate = new Date(b.item.transactionTime ?? b.item.settlementTime ?? 0).getTime();
    return bDate - aDate;
  });
}

export async function updateTransactionNote(
  accountUid: string,
  categoryUid: string,
  feedItemUid: string,
  note: string,
): Promise<void> {
  if (isDemoMode()) {
    throw new Error("Editing notes is disabled in Demo Data mode.");
  }
  await request(`/api/v2/feed/account/${accountUid}/category/${categoryUid}/${feedItemUid}/user-note`, {
    method: "PUT",
    body: {
      userNote: note,
    },
  });
}

export async function getSpaces(accountUid: string): Promise<StarlingSpace[]> {
  if (isDemoMode()) {
    return getDemoSpacesByAccount()[accountUid] ?? [];
  }
  const response = await request<Record<string, unknown>>(`/api/v2/account/${accountUid}/spaces`);
  const fromSpacesEndpoint = parseSpacesResponse(response);
  if (fromSpacesEndpoint.length > 0) {
    return fromSpacesEndpoint;
  }

  // Fallback: some accounts expose savings goals only via the dedicated endpoint.
  const savingsGoalsResponse = await request<Record<string, unknown>>(`/api/v2/account/${accountUid}/savings-goals`);
  return parseSpacesResponse(savingsGoalsResponse);
}

export async function getPayees(): Promise<StarlingPayee[]> {
  if (isDemoMode()) {
    return getDemoPayees();
  }
  const response = await request<{ payees?: StarlingPayee[] }>("/api/v2/payees");
  return getArray<StarlingPayee>(response.payees);
}

export async function getCards(): Promise<StarlingCard[]> {
  if (isDemoMode()) {
    return getDemoCards();
  }
  const response = await request<Record<string, unknown>>("/api/v2/cards");
  const rawCards = firstArrayFromKeys<unknown>(response, ["cards", "cardList", "items", "debitCards", "virtualCards"]);
  const normalized = rawCards
    .map((item) => normalizeCard(item))
    .filter((item): item is StarlingCard => item !== undefined);

  if (normalized.length > 0) {
    return normalized;
  }

  // Legacy fallback for API variants that return a single card object.
  const legacyCandidate = normalizeCard(response.card ?? response);
  return legacyCandidate ? [legacyCandidate] : [];
}

export async function updateCardControl(params: {
  cardUid: string;
  control: StarlingCardControl;
  enabled: boolean;
}): Promise<void> {
  if (isDemoMode()) {
    throw new Error("Card controls are disabled in Demo Data mode.");
  }
  await request(`/api/v2/cards/${params.cardUid}/controls/${params.control}`, {
    method: "PUT",
    body: {
      enabled: params.enabled,
    },
  });
}

export async function getMandates(accountUid?: string): Promise<StarlingMandate[]> {
  if (isDemoMode()) {
    return getDemoMandates();
  }
  const path = accountUid ? `/api/v2/direct-debit/mandates/account/${accountUid}` : "/api/v2/direct-debit/mandates";
  const response = await request<Record<string, unknown>>(path);
  const rawMandates = firstArrayFromKeys<unknown>(response, ["mandates", "directDebitMandates", "items"]);
  return rawMandates
    .map((item) => normalizeMandate(item))
    .filter((item): item is StarlingMandate => item !== undefined);
}

export async function cancelMandate(mandateUid: string): Promise<void> {
  if (isDemoMode()) {
    throw new Error("Canceling mandates is disabled in Demo Data mode.");
  }
  await request(`/api/v2/direct-debit/mandates/${mandateUid}`, {
    method: "DELETE",
  });
}
