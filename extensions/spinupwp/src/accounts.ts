import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { Account } from "./types";
import { isDemoMode, mockAccounts } from "./mock-data";

const ACCOUNTS_KEY = "spinupwp_accounts";
const ACTIVE_ACCOUNT_KEY = "spinupwp_active_account";

/**
 * Generate a unique ID for a new account
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Get all stored accounts
 */
export async function getAccounts(): Promise<Account[]> {
  if (isDemoMode()) return mockAccounts;

  const data = await LocalStorage.getItem<string>(ACCOUNTS_KEY);
  if (!data) {
    return [];
  }
  try {
    return JSON.parse(data) as Account[];
  } catch {
    return [];
  }
}

/**
 * Save accounts to LocalStorage
 */
async function saveAccounts(accounts: Account[]): Promise<void> {
  await LocalStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

/**
 * Add a new account
 */
export async function addAccount(name: string, token: string): Promise<Account> {
  const accounts = await getAccounts();

  const newAccount: Account = {
    id: generateId(),
    name: name.trim(),
    token: token.trim(),
  };

  accounts.push(newAccount);
  await saveAccounts(accounts);

  // If this is the first account, set it as active
  if (accounts.length === 1) {
    await setActiveAccountId(newAccount.id);
  }

  return newAccount;
}

/**
 * Update an existing account
 */
export async function updateAccount(id: string, name: string, token: string): Promise<Account | null> {
  const accounts = await getAccounts();
  const index = accounts.findIndex((a) => a.id === id);

  if (index === -1) {
    return null;
  }

  accounts[index] = {
    ...accounts[index],
    name: name.trim(),
    token: token.trim(),
  };

  await saveAccounts(accounts);
  return accounts[index];
}

/**
 * Delete an account by ID
 */
export async function deleteAccount(id: string): Promise<void> {
  const accounts = await getAccounts();
  const filtered = accounts.filter((a) => a.id !== id);
  await saveAccounts(filtered);

  // If we deleted the active account, set a new active account
  const activeId = await getActiveAccountId();
  if (activeId === id) {
    if (filtered.length > 0) {
      await setActiveAccountId(filtered[0].id);
    } else {
      await LocalStorage.removeItem(ACTIVE_ACCOUNT_KEY);
    }
  }
}

/**
 * Get the active account ID
 */
export async function getActiveAccountId(): Promise<string | null> {
  if (isDemoMode()) return mockAccounts[0]?.id || null;

  const id = await LocalStorage.getItem<string>(ACTIVE_ACCOUNT_KEY);
  return id || null;
}

/**
 * Set the active account ID
 */
export async function setActiveAccountId(id: string): Promise<void> {
  if (isDemoMode()) return; // No-op in demo mode

  await LocalStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
}

/**
 * Get an account by ID
 */
export async function getAccountById(id: string): Promise<Account | null> {
  const accounts = await getAccounts();
  return accounts.find((a) => a.id === id) || null;
}

/**
 * Get the active account
 */
export async function getActiveAccount(): Promise<Account | null> {
  const activeId = await getActiveAccountId();
  if (!activeId) {
    const accounts = await getAccounts();
    return accounts[0] || null;
  }
  return getAccountById(activeId);
}

/**
 * Get the active API token
 * This is the main function used by the API module
 * Priority: 1) Active account, 2) Preferences token (for default account)
 */
export async function getActiveToken(): Promise<string> {
  if (isDemoMode()) return "demo-token";

  // First, try to get token from active account
  const account = await getActiveAccount();
  if (account) {
    return account.token;
  }

  // Fallback to preferences token (for default account)
  try {
    const { apiToken } = getPreferenceValues<Preferences>();
    if (apiToken && apiToken.trim()) {
      return apiToken;
    }
  } catch {
    // No preferences set
  }

  throw new Error("No API token configured. Please add an account in SpinupWP Accounts or set a token in preferences.");
}

/**
 * Check if any accounts are configured
 */
export async function hasAccounts(): Promise<boolean> {
  const accounts = await getAccounts();
  if (accounts.length > 0) {
    return true;
  }

  // Check if preference token exists (for default account)
  try {
    const { apiToken } = getPreferenceValues<Preferences>();
    return !!(apiToken && apiToken.trim());
  } catch {
    return false;
  }
}
