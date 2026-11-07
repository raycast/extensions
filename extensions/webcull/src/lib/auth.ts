import { LocalStorage, open } from "@raycast/api";
import crypto from "node:crypto";
import { postWebCull, responseMessage, WebCullAuthError } from "./http";
import { getWebCullPreferences } from "./preferences";
import { WebCullAuthState, WebCullAuthTokenResponse, WebCullSavedAccount } from "../types";

const TOKEN_KEY = "webcull_auth_token";
const ACCOUNTS_KEY = "webcull_auth_accounts";
const ACTIVE_ACCOUNT_KEY = "webcull_active_account_id";
const REQUEST_TTL_MS = 300000;
let tokenSaveQueue: Promise<void> = Promise.resolve();

export class AuthHandoffCancelledError extends Error {
  constructor() {
    super("WebCull login was cancelled or replaced.");
  }
}

export function randomBase64Url(bytes: number): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function hashBase64Url(value: string): string {
  return crypto.createHash("sha256").update(value).digest("base64url");
}

export async function getAuthState(): Promise<WebCullAuthState> {
  const active = await getActiveAccount();

  if (!active) {
    return { connected: false };
  }

  return {
    connected: true,
    token: active.token,
    expires: active.expires,
    user: active.user || null,
    scopes: active.scopes || [],
    accountId: active.accountId,
  };
}

export async function getSavedAuthAccounts(): Promise<{
  accounts: WebCullSavedAccount[];
  activeAccountId: string | null;
}> {
  await migrateLegacyToken();
  const raw = await LocalStorage.getItem<string>(ACCOUNTS_KEY);
  const activeAccountId = (await LocalStorage.getItem<string>(ACTIVE_ACCOUNT_KEY)) || null;
  const accounts = parseSavedAccounts(raw).filter((account) => !isExpired(account));

  if (raw && accounts.length !== parseSavedAccounts(raw).length) {
    await saveAccounts(accounts);
  }

  if (!accounts.length) {
    await LocalStorage.removeItem(ACTIVE_ACCOUNT_KEY);
    return { accounts: [], activeAccountId: null };
  }

  if (activeAccountId && accounts.some((account) => account.accountId === activeAccountId)) {
    return { accounts, activeAccountId };
  }

  await LocalStorage.removeItem(ACTIVE_ACCOUNT_KEY);
  return { accounts, activeAccountId: null };
}

export async function getActiveAccount(): Promise<WebCullSavedAccount | null> {
  const { accounts, activeAccountId } = await getSavedAuthAccounts();
  if (!activeAccountId) {
    return null;
  }
  return accounts.find((account) => account.accountId === activeAccountId) || null;
}

export async function setActiveAuthAccount(accountId: string): Promise<void> {
  const { accounts } = await getSavedAuthAccounts();
  if (!accounts.some((account) => account.accountId === accountId)) {
    throw new Error("Saved WebCull account not found.");
  }
  await LocalStorage.setItem(ACTIVE_ACCOUNT_KEY, accountId);
}

export async function removeAuthAccount(accountId: string): Promise<void> {
  const { accounts, activeAccountId } = await getSavedAuthAccounts();
  const nextAccounts = accounts.filter((account) => account.accountId !== accountId);

  await saveAccounts(nextAccounts);

  if (!nextAccounts.length) {
    await LocalStorage.removeItem(ACTIVE_ACCOUNT_KEY);
    return;
  }

  if (activeAccountId === accountId) {
    await LocalStorage.removeItem(ACTIVE_ACCOUNT_KEY);
  }
}

export async function requireAuthToken(expectedAccountId: string): Promise<string> {
  const auth = await getAuthState();

  if (!auth.connected || !auth.token) {
    throw new WebCullAuthError();
  }

  if (!expectedAccountId || auth.accountId !== expectedAccountId) {
    throw new Error("The active WebCull account changed. Reopen this command before saving.");
  }

  return auth.token;
}

export async function postAuthenticatedWebCull(
  apiBaseUrl: string,
  path: string,
  data: Parameters<typeof postWebCull>[2],
  token: string,
) {
  try {
    return await postWebCull(apiBaseUrl, path, data, token);
  } catch (error) {
    if (error instanceof WebCullAuthError) {
      // A late rejection must never remove a replacement token or another account.
      const discard = async () => {
        const { accounts } = await getSavedAuthAccounts();
        const rejected = accounts.find((account) => account.token === token);
        if (rejected) await removeAuthAccount(rejected.accountId);
      };
      const pending = tokenSaveQueue.then(discard, discard);
      tokenSaveQueue = pending;
      await pending;
    }
    throw error;
  }
}

async function saveAuthToken(
  response: WebCullAuthTokenResponse,
  isCurrent: () => boolean,
): Promise<void> {
  const assertCurrent = () => {
    if (!isCurrent()) throw new AuthHandoffCancelledError();
  };
  assertCurrent();
  if (response.success !== "true" || !response.token || !response.expires) {
    throw new Error(response.failure || response.error || "WebCull login did not return a token.");
  }

  const { accounts } = await getSavedAuthAccounts();
  assertCurrent();
  const account = tokenResponseToAccount(response);
  const replacedAccount = accounts.find(
    (savedAccount) => savedAccount.accountId === account.accountId,
  );
  if (replacedAccount && replacedAccount.token !== account.token) {
    await revokeAuthToken(replacedAccount.token);
    await removeAuthAccount(replacedAccount.accountId);
    assertCurrent();
  }
  const nextAccounts = [
    account,
    ...accounts.filter((savedAccount) => savedAccount.accountId !== account.accountId),
  ];

  await saveAccounts(nextAccounts);
  assertCurrent();
  await LocalStorage.setItem(ACTIVE_ACCOUNT_KEY, account.accountId);
  assertCurrent();
  await LocalStorage.removeItem(TOKEN_KEY);
  assertCurrent();
}

async function revokeAuthToken(token: string): Promise<void> {
  const preferences = getWebCullPreferences();
  const response = await postWebCull(preferences.apiBaseUrl, "/raycast/auth-logout", {}, token);
  if (response.success !== "true") {
    throw new Error(responseMessage(response, "Could not revoke the Raycast authorization."));
  }
}

async function clearAllAuthTokens(): Promise<void> {
  await LocalStorage.removeItem(TOKEN_KEY);
  await LocalStorage.removeItem(ACCOUNTS_KEY);
  await LocalStorage.removeItem(ACTIVE_ACCOUNT_KEY);
}

export async function revokeAuthAccount(accountId: string): Promise<void> {
  const { accounts } = await getSavedAuthAccounts();
  const account = accounts.find((savedAccount) => savedAccount.accountId === accountId);
  if (!account) {
    throw new Error("Saved WebCull account not found.");
  }
  await revokeAuthToken(account.token);
  await removeAuthAccount(account.accountId);
}

export async function revokeAllAuthAccounts(): Promise<void> {
  const { accounts } = await getSavedAuthAccounts();
  for (const account of accounts) {
    await revokeAuthToken(account.token);
    await removeAuthAccount(account.accountId);
  }
  await clearAllAuthTokens();
}

export async function startAuthHandoff(isCurrent: () => boolean): Promise<{
  request: string;
  verifier: string;
  approvalUrl: string;
  expires: number;
}> {
  const preferences = getWebCullPreferences();
  const request = randomBase64Url(32);
  const verifier = randomBase64Url(48);
  const challenge = hashBase64Url(verifier);
  const response = await postWebCull(preferences.apiBaseUrl, "/raycast/auth-start", {
    request,
    challenge,
  });

  if (response.success !== "true") {
    throw new Error(responseMessage(response, "Could not start WebCull login."));
  }

  const approvalUrl = `${preferences.appBaseUrl}/accounts#raycast-auth/${encodeURIComponent(request)}`;
  if (isCurrent()) await open(approvalUrl);

  return {
    request,
    verifier,
    approvalUrl,
    expires: Date.now() + REQUEST_TTL_MS,
  };
}

export async function redeemAuthHandoff(
  request: string,
  verifier: string,
  isCurrent: () => boolean,
): Promise<WebCullAuthTokenResponse> {
  const preferences = getWebCullPreferences();
  const response = (await postWebCull(preferences.apiBaseUrl, "/raycast/auth-redeem", {
    request,
    verifier,
    name: "WebCull Raycast",
  })) as WebCullAuthTokenResponse;

  if (response.success === "true") {
    // Serialize commits and cleanup so an older attempt cannot overwrite a newer token.
    const save = async () => {
      try {
        await saveAuthToken(response, isCurrent);
      } catch (error) {
        if (!response.token) throw error;
        try {
          await revokeAuthToken(response.token);
        } catch {
          throw new Error(
            "WebCull could not discard the unused Raycast authorization. Check connected applications in WebCull before reconnecting.",
          );
        } finally {
          const account = tokenResponseToAccount(response);
          const { accounts } = await getSavedAuthAccounts();
          if (
            accounts.some(
              (saved) => saved.accountId === account.accountId && saved.token === account.token,
            )
          ) {
            await removeAuthAccount(account.accountId);
          }
        }
        throw error;
      }
    };
    const pendingSave = tokenSaveQueue.then(save, save);
    tokenSaveQueue = pendingSave;
    await pendingSave;
  }

  return response;
}

function tokenResponseToAccount(response: WebCullAuthTokenResponse): WebCullSavedAccount {
  if (!response.token || !response.expires) {
    throw new Error("WebCull login did not return a token.");
  }

  const user = response.user || null;
  return {
    accountId: accountIdForToken(response.token, user?.id, user?.hash),
    token: response.token,
    expires: Number(response.expires),
    scopes: response.scopes || [],
    user,
    connectedAt: Math.floor(Date.now() / 1000),
  };
}

function parseSavedAccounts(raw: string | undefined): WebCullSavedAccount[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as WebCullSavedAccount[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((account) =>
      Boolean(account.accountId && account.token && account.expires),
    );
  } catch {
    return [];
  }
}

async function saveAccounts(accounts: WebCullSavedAccount[]): Promise<void> {
  if (!accounts.length) {
    await LocalStorage.removeItem(ACCOUNTS_KEY);
    return;
  }
  await LocalStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

async function migrateLegacyToken(): Promise<void> {
  const legacyRaw = await LocalStorage.getItem<string>(TOKEN_KEY);
  if (!legacyRaw) {
    return;
  }

  try {
    const parsed = JSON.parse(legacyRaw) as WebCullAuthTokenResponse;
    if (parsed.token && parsed.expires && Number(parsed.expires) > Math.floor(Date.now() / 1000)) {
      const account = tokenResponseToAccount(parsed);
      const existingAccounts = parseSavedAccounts(await LocalStorage.getItem<string>(ACCOUNTS_KEY));
      await saveAccounts([
        account,
        ...existingAccounts.filter((savedAccount) => savedAccount.accountId !== account.accountId),
      ]);
      await LocalStorage.setItem(ACTIVE_ACCOUNT_KEY, account.accountId);
    }
  } finally {
    await LocalStorage.removeItem(TOKEN_KEY);
  }
}

function isExpired(account: WebCullSavedAccount): boolean {
  return Number(account.expires) <= Math.floor(Date.now() / 1000);
}

function accountIdForToken(token: string, userId?: number, userHash?: string): string {
  if (userId) {
    return `user:${userId}`;
  }
  if (userHash) {
    return `hash:${userHash}`;
  }
  return `token:${hashBase64Url(token).slice(0, 24)}`;
}
