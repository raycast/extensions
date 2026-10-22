import { getAccessToken, ensureValidToken } from "./auth";
import {
  CategoriesResponse,
  Category,
  DataSnapshot,
  Transaction,
  TransactionsResponse,
  CredentialWithAccounts,
} from "./types";
import { API_BASE_URL, SDK_PLATFORM, SDK_VERSION, CLIENT_ID, API_VERSION, APP_BASE_URL } from "./constants";

/**
 * Get default headers for API requests
 */
async function getDefaultHeaders(): Promise<Record<string, string>> {
  const accessToken = await getAccessToken();

  return {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    Authorization: `Bearer ${accessToken}`,
    Origin: APP_BASE_URL,
    Referer: `${APP_BASE_URL}/`,
    "mt-sdk-platform": SDK_PLATFORM,
    "mt-sdk-version": SDK_VERSION,
    "x-api-key": CLIENT_ID,
    "x-api-version": API_VERSION,
    "x-client-id": "N/A",
    "x-client-name": "N/A",
    "x-client-sdk": "N/A",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  };
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = await getDefaultHeaders();
  const url = `${API_BASE_URL}${endpoint}`;
  const method = options.method || "GET";

  console.debug(`[API] ${method} ${url}`);

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (response.status === 401) {
    console.debug(`[API] 401 Unauthorized - Attempting token refresh for ${url}`);
    // Token might be expired, try to refresh
    try {
      await ensureValidToken();
    } catch {
      console.debug(`[API] Token refresh failed for ${url}`);
      throw new Error("Authentication failed. Please check your credentials.");
    }
    // Retry the request with the refreshed token; only a second 401 points to credentials.
    const newHeaders = await getDefaultHeaders();
    console.debug(`[API] Retrying ${method} ${url} with refreshed token`);
    const retryResponse = await fetch(url, {
      ...options,
      headers: {
        ...newHeaders,
        ...options.headers,
      },
    });

    if (retryResponse.status === 401) {
      console.debug(`[API] Retry still unauthorized for ${url}`);
      throw new Error("Authentication failed. Please check your credentials.");
    }
    if (!retryResponse.ok) {
      console.debug(`[API] Retry failed: ${retryResponse.status}`);
      throw new Error(`API request failed: ${retryResponse.status}`);
    }

    console.debug(`[API] ${method} ${url} - Success (after refresh)`);
    return parseApiResponse<T>(retryResponse);
  }

  if (!response.ok) {
    console.debug(`[API] ${method} ${url} - Error ${response.status}`);
    throw new Error(`API request failed: ${response.status}`);
  }

  console.debug(`[API] ${method} ${url} - Success (${response.status})`);
  return parseApiResponse<T>(response);
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const body = await response.text();
  return (body ? JSON.parse(body) : undefined) as T;
}

/**
 * Get data snapshot including all accounts and credentials
 * This is the single source of truth for both credentials and accounts
 */
export async function getDataSnapshot(): Promise<DataSnapshot> {
  console.debug("[API] getDataSnapshot() - Fetching data snapshot");
  const headers = await getDefaultHeaders();
  const response = await apiRequest<DataSnapshot>("/web/presenter/guests/data_snapshot.json?locale=en", {
    method: "GET",
    headers: {
      ...headers,
      "mt-app-name": "mt-personal-web",
    },
  });

  const accountCount = response.guest.credentials.reduce((sum, cred) => sum + cred.accounts.length, 0);
  console.debug(
    `[API] getDataSnapshot() - Received ${response.guest.credentials.length} credentials with ${accountCount} total accounts`,
  );
  return response;
}

/**
 * Get all accounts flattened from data snapshot
 */
export async function getAllAccounts(): Promise<CredentialWithAccounts[]> {
  const snapshot = await getDataSnapshot();
  return snapshot.guest.credentials;
}

/**
 * Get credentials from data snapshot
 */
export async function getCredentials(): Promise<CredentialWithAccounts[]> {
  const snapshot = await getDataSnapshot();
  return snapshot.guest.credentials;
}

/**
 * Get Moneytree transaction categories.
 */
export async function getCategories(): Promise<Category[]> {
  const response = await apiRequest<CategoriesResponse>("/presenter/categories.json?locale=en", { method: "GET" });
  return response.categories;
}

/**
 * Read saved category budgets.
 * The response contains budget definitions, not calculated spending progress.
 */
export type Budget = { category_id: number; amount: number };

export async function getBudgets(): Promise<Budget[]> {
  const response = await apiRequest<{ budgets: Budget[] }>("/budgets.json", { method: "GET" });
  if (!Array.isArray(response?.budgets)) {
    throw new Error("Unexpected Moneytree budgets response");
  }
  return response.budgets;
}

/** Monthly spending totals per category for each period. */
export type SpendingPeriod = {
  start_date: string;
  end_date: string;
  total: number;
  categories: Record<string, number>;
};

export async function getMonthlySpending(startDate: string, endDate: string): Promise<SpendingPeriod[]> {
  const params = new URLSearchParams({
    group_by: "monthly_period",
    start_date: startDate,
    end_date: endDate,
    end_of_month: "0",
    include_gap: "true",
  });
  const response = await apiRequest<{ category_totals: SpendingPeriod[] }>(
    `/presenter/spending_historical.json?${params.toString()}`,
  );
  if (!Array.isArray(response?.category_totals)) throw new Error("Unexpected Moneytree spending response");
  return response.category_totals;
}

/** This PUT route both sets an existing limit and creates a new one. */
export async function putBudget(categoryId: number, amount: number): Promise<void> {
  await apiRequest<unknown>(`/budgets/${categoryId}.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  });
}

export async function removeBudget(categoryId: number): Promise<void> {
  await apiRequest<void>(`/budgets/${categoryId}.json`, { method: "DELETE" });
}

/**
 * Create a custom Moneytree subcategory.
 */
export async function createCategory(options: { parentId: number; name: string; iconKey?: string }): Promise<Category> {
  const response = await apiRequest<{ category: Category }>("/command/categories.json?locale=en", {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
    },
    body: JSON.stringify({
      category: {
        parent_id: String(options.parentId),
        name: options.name,
        icon_key: options.iconKey || "uncategorized",
      },
    }),
  });

  return response.category;
}

/**
 * Update a custom Moneytree category.
 */
export async function updateCategory(options: {
  categoryId: number;
  parentId: number;
  name: string;
  iconKey?: string;
}): Promise<Category> {
  const response = await apiRequest<{ category: Category }>(
    `/command/categories/${options.categoryId}.json?locale=en`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify({
        category: {
          parent_id: String(options.parentId),
          name: options.name,
          icon_key: options.iconKey || "uncategorized",
        },
      }),
    },
  );

  return response.category;
}

/**
 * Get transactions for a date range
 */
/**
 * Get a single page of transactions
 */
export async function getTransactionPage(options: {
  startDate: Date;
  endDate: Date;
  page?: number;
  accountId?: number;
  search?: string;
}): Promise<TransactionsResponse> {
  const { startDate, endDate, page = 1, accountId, search } = options;

  // Format dates as MM/DD/YYYY
  const formatDate = (date: Date): string => {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const params: Record<string, string> = {
    start_date: formatDate(startDate),
    end_date: formatDate(endDate),
    exclude_corporate: "true",
    locale: "en",
    show_transactions_details: "true",
    transaction: "{}",
    page: String(page),
    per_page: "25",
  };

  if (accountId) {
    params.account_id = String(accountId);
  }

  if (search) {
    params.search = search;
  }

  const searchParams = new URLSearchParams(params);
  console.debug(
    `[API] getTransactionPage() - page=${page}${search ? ` search="${search}"` : ""} (${formatDate(startDate)} to ${formatDate(endDate)})`,
  );

  const response = await apiRequest<TransactionsResponse>(
    `/web/presenter/transactions.json?${searchParams.toString()}`,
    { method: "GET" },
  );

  console.debug(
    `[API] getTransactionPage() - Page ${page}: ${response.transactions.length} transactions (total: ${response.transactions_details.transactions_count})`,
  );
  return response;
}

/**
 * Update editable transaction fields.
 */
export async function updateTransaction(options: {
  transaction: Transaction;
  descriptionGuest: string | null;
  categoryId: number;
}): Promise<Transaction> {
  const { transaction, descriptionGuest, categoryId } = options;
  const response = await apiRequest<{
    transaction: Transaction & {
      account?: { id: number };
      category?: { id: number };
    };
  }>(`/command/transactions/${transaction.id}.json?locale=en`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
    },
    body: JSON.stringify({
      transaction: {
        date: transaction.date,
        amount: transaction.amount,
        category_id: categoryId,
        description_guest: descriptionGuest,
        claim_id: transaction.claim_id,
        expense_type: transaction.expense_type,
      },
      upload_ids: [],
    }),
  });

  return {
    ...response.transaction,
    account_id: response.transaction.account_id ?? response.transaction.account?.id ?? transaction.account_id,
    category_id: response.transaction.category_id ?? response.transaction.category?.id ?? categoryId,
  };
}
