import { getAccessToken, ensureValidToken } from "./auth";
import { DataSnapshot, TransactionsResponse, CredentialWithAccounts } from "./types";
import { API_BASE_URL, SDK_PLATFORM, SDK_VERSION, CLIENT_ID, API_VERSION } from "./constants";

/**
 * Get default headers for API requests
 */
async function getDefaultHeaders(): Promise<Record<string, string>> {
  const accessToken = await getAccessToken();

  return {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    Authorization: `Bearer ${accessToken}`,
    Origin: "https://app.getmoneytree.com",
    Referer: "https://app.getmoneytree.com/",
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
      // Retry the request with new token
      const newHeaders = await getDefaultHeaders();
      console.debug(`[API] Retrying ${method} ${url} with refreshed token`);
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          ...newHeaders,
          ...options.headers,
        },
      });

      if (!retryResponse.ok) {
        console.debug(`[API] Retry failed: ${retryResponse.status} ${retryResponse.statusText}`);
        throw new Error(`API request failed: ${retryResponse.status} ${retryResponse.statusText}`);
      }

      console.debug(`[API] ${method} ${url} - Success (after refresh)`);
      return retryResponse.json() as Promise<T>;
    } catch (error) {
      console.debug(`[API] Authentication failed for ${url}: ${error}`);
      throw new Error("Authentication failed. Please check your credentials.");
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.debug(`[API] ${method} ${url} - Error ${response.status}: ${errorText.substring(0, 200)}`);
    throw new Error(`API request failed: ${response.status} ${errorText}`);
  }

  console.debug(`[API] ${method} ${url} - Success (${response.status})`);
  return response.json() as Promise<T>;
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
 * Get transactions for a date range
 */
export async function getTransactions(
  startDate: Date,
  endDate: Date,
  accountId?: number,
): Promise<TransactionsResponse> {
  // Format dates as MM/DD/YYYY
  const formatDate = (date: Date): string => {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const params = new URLSearchParams({
    start_date: formatDate(startDate),
    end_date: formatDate(endDate),
    exclude_corporate: "true",
    locale: "en",
    show_transactions_details: "true",
    transaction: "{}",
  });

  if (accountId) {
    params.append("account_id", String(accountId));
  }

  const dateRange = `${formatDate(startDate)} to ${formatDate(endDate)}`;
  console.debug(
    `[API] getTransactions() - Fetching transactions${accountId ? ` for account ${accountId}` : ""} (${dateRange})`,
  );

  const response = await apiRequest<TransactionsResponse>(`/web/presenter/transactions.json?${params.toString()}`, {
    method: "GET",
  });

  console.debug(
    `[API] getTransactions() - Received ${response.transactions.length} transactions (total: ${response.transactions_details.transactions_total})`,
  );
  return response;
}
