import {
  createCategory,
  getAllAccounts,
  getCategories,
  getCredentials,
  getTransactionPage,
  updateCategory,
  updateTransaction,
} from "./api";
import { getAccessToken } from "./auth";
import { CACHE_KEYS, clearCache, getCached, removeCached, setCached } from "./cache";
import { CACHE_TTL } from "./constants";
import { Account, Category, CredentialWithAccounts, Transaction, TransactionsResponse } from "./types";

export type AccountWithCredential = Account & { credentialName: string; credentialStatus: string };

export type TransactionQueryOptions = {
  query?: string;
  accountId?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
};

export function getCredentialName(credential: CredentialWithAccounts): string {
  if (credential.status === "manual") return "Cash Tracking";
  return credential.institution_name || `Credential #${credential.id}`;
}

export function getCredentialTotalBalance(credential: CredentialWithAccounts): number {
  return credential.accounts.reduce((sum, acc) => sum + acc.current_balance_in_base, 0);
}

export function flattenAccounts(credentials: CredentialWithAccounts[]): AccountWithCredential[] {
  return credentials.flatMap((credential) =>
    credential.accounts.map((account) => ({
      ...account,
      credentialName: getCredentialName(credential),
      credentialStatus: credential.status,
    })),
  );
}

export function getTransactionDateRange(options: { hasFilter?: boolean; startDate?: string; endDate?: string }): {
  startDate: Date;
  endDate: Date;
} {
  const endDate = options.endDate ? parseISODate(options.endDate, "endDate") : new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = options.startDate ? parseISODate(options.startDate, "startDate") : new Date(endDate);
  if (!options.startDate) {
    if (options.hasFilter) {
      startDate.setMonth(startDate.getMonth() - 6);
      startDate.setDate(1);
    } else {
      startDate.setDate(startDate.getDate() - 30);
    }
  }
  startDate.setHours(0, 0, 0, 0);

  if (startDate > endDate) {
    throw new Error("startDate must be before endDate");
  }

  return { startDate, endDate };
}

export async function getCachedCredentials(): Promise<CredentialWithAccounts[]> {
  const cached = getCached<CredentialWithAccounts[]>(CACHE_KEYS.dataSnapshot());
  if (cached && cached.length > 0) {
    return cached;
  }

  await getAccessToken();
  const credentials = await getCredentials();
  setCached(CACHE_KEYS.dataSnapshot(), credentials, CACHE_TTL.ACCOUNTS);
  return credentials;
}

export async function getCredentialsWithCacheStatus(): Promise<{
  credentials: CredentialWithAccounts[];
  wasCached: boolean;
}> {
  const cached = getCached<CredentialWithAccounts[]>(CACHE_KEYS.dataSnapshot());
  if (cached && cached.length > 0) {
    return { credentials: cached, wasCached: true };
  }

  await getAccessToken();
  const credentials = await getCredentials();
  setCached(CACHE_KEYS.dataSnapshot(), credentials, CACHE_TTL.ACCOUNTS);
  return { credentials, wasCached: false };
}

export async function refreshCachedCredentials(): Promise<CredentialWithAccounts[]> {
  await getAccessToken();
  const credentials = await getAllAccounts();
  setCached(CACHE_KEYS.dataSnapshot(), credentials, CACHE_TTL.ACCOUNTS);
  return credentials;
}

export async function getCachedCategories(): Promise<Category[]> {
  const cached = getCached<Category[]>(CACHE_KEYS.categories());
  if (cached && cached.length > 0) {
    return cached;
  }

  await getAccessToken();
  const categories = await getCategories();
  setCached(CACHE_KEYS.categories(), categories, CACHE_TTL.ACCOUNTS);
  return categories;
}

export async function createCustomCategory(options: {
  parentId: number;
  name: string;
  iconKey?: string;
}): Promise<Category> {
  const category = await createCategory(options);
  removeCached(CACHE_KEYS.categories());
  return category;
}

export async function updateCustomCategory(options: {
  categoryId: number;
  parentId: number;
  name: string;
  iconKey?: string;
}): Promise<Category> {
  const category = await updateCategory(options);
  removeCached(CACHE_KEYS.categories());
  return category;
}

export function clearCachedCredentials(): void {
  removeCached(CACHE_KEYS.dataSnapshot());
}

export async function getCachedAccounts(options?: { includeUnsupported?: boolean }): Promise<AccountWithCredential[]> {
  const credentials = await getCachedCredentials();
  const accounts = flattenAccounts(credentials);
  if (options?.includeUnsupported) return accounts;
  return accounts.filter((account) => !["manual", "cash_wallet"].includes(account.account_type));
}

export async function fetchTransactionPage(options: TransactionQueryOptions): Promise<TransactionsResponse> {
  await getAccessToken();
  const { startDate, endDate } = getTransactionDateRange({
    hasFilter: Boolean(options.query || options.accountId),
    startDate: options.startDate,
    endDate: options.endDate,
  });

  return getTransactionPage({
    startDate,
    endDate,
    page: options.page ?? 1,
    search: options.query || undefined,
    accountId: options.accountId,
  });
}

export async function fetchTransactions(options: TransactionQueryOptions & { maxPages?: number }): Promise<{
  transactions: Transaction[];
  details: TransactionsResponse["transactions_details"];
}> {
  const maxPages = Math.min(Math.max(options.maxPages ?? 1, 1), 10);
  const transactions: Transaction[] = [];
  let details: TransactionsResponse["transactions_details"] | undefined;
  let page = options.page ?? 1;

  for (let fetchedPages = 0; fetchedPages < maxPages; fetchedPages += 1) {
    const response = await fetchTransactionPage({ ...options, page });
    transactions.push(...response.transactions);
    details = response.transactions_details;

    if (transactions.length >= details.transactions_count || response.transactions.length === 0) {
      break;
    }
    page += 1;
  }

  if (!details) {
    throw new Error("Failed to fetch transactions");
  }

  return { transactions, details };
}

export async function updateTransactionDetails(options: {
  transaction: Transaction;
  descriptionGuest: string | null;
  categoryId: number;
}): Promise<Transaction> {
  const transaction = await updateTransaction(options);
  clearCache();
  return transaction;
}

function parseISODate(value: string, fieldName: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${fieldName} must use YYYY-MM-DD format`);
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} is not a valid date`);
  }

  return date;
}
