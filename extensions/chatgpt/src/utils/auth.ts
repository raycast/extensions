import { getPreferenceValues, LocalStorage, open } from "@raycast/api";
import { CodexAppServerClient, withCodexAppServer } from "./codex-app-server";

export type AuthProvider = "none" | "apiKey" | "chatgpt";

export interface CodexAuthSession {
  email: string;
  planType: string | null;
  updatedAt: string;
}

export interface AuthStatus {
  provider: AuthProvider;
  hasApiKey: boolean;
  hasChatGPTSession: boolean;
  apiKey: string;
  session: CodexAuthSession | null;
}

interface ChatGPTAccount {
  type: "chatgpt";
  email: string;
  planType?: string | null;
}

interface AccountReadResponse {
  account: { type?: string; email?: string; planType?: string | null } | null;
  requiresOpenaiAuth: boolean;
}

interface LoginStartResponse {
  type: "chatgpt" | string;
  loginId?: string;
  authUrl?: string;
}

interface LoginCompletedNotification {
  loginId: string | null;
  success: boolean;
  error: string | null;
}

const AUTH_STATUS_CACHE_MS = 15 * 1000;
const AUTH_STATUS_STORAGE_KEY = "chatgpt-auth-status-cache";

let cachedChatGPTAccount: {
  account: ChatGPTAccount | null;
  expiresAt: number;
} | null = null;
let resolveAuthStatusPromise: Promise<AuthStatus> | null = null;

export function getConfiguredApiKey(preferences?: Preferences): string {
  const config = preferences ?? getPreferenceValues<Preferences>();
  return (config.apiKey ?? "").trim();
}

export function getInitialAuthStatus(preferences?: Preferences): AuthStatus {
  const config = preferences ?? getPreferenceValues<Preferences>();
  const apiKey = getConfiguredApiKey(config);
  const hasApiKey = apiKey.length > 0;

  return {
    provider: hasApiKey ? "apiKey" : "none",
    hasApiKey,
    hasChatGPTSession: false,
    apiKey,
    session: null,
  };
}

export async function resolveAuthStatus(preferences?: Preferences): Promise<AuthStatus> {
  if (resolveAuthStatusPromise) {
    return resolveAuthStatusPromise;
  }

  resolveAuthStatusPromise = (async () => {
    const config = preferences ?? getPreferenceValues<Preferences>();
    const initial = getInitialAuthStatus(config);
    const account = (await readCachedChatGPTAccountFromStorage()) ?? (await readChatGPTAccountSafe());
    const hasChatGPTSession = !!account;

    return {
      provider: initial.hasApiKey ? "apiKey" : hasChatGPTSession ? "chatgpt" : "none",
      hasApiKey: initial.hasApiKey,
      hasChatGPTSession,
      apiKey: initial.apiKey,
      session: account
        ? {
            email: account.email,
            planType: account.planType ?? null,
            updatedAt: new Date().toISOString(),
          }
        : null,
    };
  })();

  try {
    return await resolveAuthStatusPromise;
  } finally {
    resolveAuthStatusPromise = null;
  }
}

export async function signInWithCodexAuth(): Promise<CodexAuthSession> {
  return withCodexAppServer(async (client) => {
    const response = await client.request<LoginStartResponse>("account/login/start", { type: "chatgpt" });
    if (response.type !== "chatgpt" || !response.loginId || !response.authUrl) {
      throw new Error("Codex app-server did not return a ChatGPT login URL.");
    }

    await open(response.authUrl);

    const completed = await client.waitForNotification<LoginCompletedNotification>(
      "account/login/completed",
      (params) => params.loginId === response.loginId,
    );

    if (!completed.success) {
      throw new Error(completed.error?.trim() || "ChatGPT sign-in did not complete.");
    }

    const account = await readChatGPTAccount(client);
    if (!account) {
      throw new Error("ChatGPT sign-in completed, but no active ChatGPT account was returned by Codex app-server.");
    }

    primeCachedChatGPTAccount(account);

    return {
      email: account.email,
      planType: account.planType ?? null,
      updatedAt: new Date().toISOString(),
    };
  });
}

export async function clearCodexAuthSession(): Promise<void> {
  await withCodexAppServer(async (client) => {
    await client.request("account/logout", {});
  });
  clearCachedChatGPTAccount();
  await LocalStorage.removeItem(AUTH_STATUS_STORAGE_KEY);
}

async function readChatGPTAccountSafe(): Promise<ChatGPTAccount | null> {
  if (cachedChatGPTAccount && cachedChatGPTAccount.expiresAt > Date.now()) {
    return cachedChatGPTAccount.account;
  }

  try {
    const account = await withCodexAppServer((client) => readChatGPTAccount(client));
    primeCachedChatGPTAccount(account);
    return account;
  } catch {
    return null;
  }
}

async function readChatGPTAccount(client: CodexAppServerClient): Promise<ChatGPTAccount | null> {
  const response = await client.request<AccountReadResponse>("account/read", { refreshToken: false });
  if (!response.account || response.account.type !== "chatgpt" || !response.account.email?.trim()) {
    return null;
  }

  return {
    type: "chatgpt",
    email: response.account.email.trim(),
    planType: response.account.planType ?? null,
  };
}

function primeCachedChatGPTAccount(account: ChatGPTAccount | null): void {
  cachedChatGPTAccount = {
    account,
    expiresAt: Date.now() + AUTH_STATUS_CACHE_MS,
  };

  void LocalStorage.setItem(
    AUTH_STATUS_STORAGE_KEY,
    JSON.stringify({
      account,
      expiresAt: Date.now() + AUTH_STATUS_CACHE_MS,
    }),
  );
}

function clearCachedChatGPTAccount(): void {
  cachedChatGPTAccount = null;
}

async function readCachedChatGPTAccountFromStorage(): Promise<ChatGPTAccount | null> {
  if (cachedChatGPTAccount && cachedChatGPTAccount.expiresAt > Date.now()) {
    return cachedChatGPTAccount.account;
  }

  const raw = await LocalStorage.getItem<string>(AUTH_STATUS_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      account?: ChatGPTAccount | null;
      expiresAt?: number;
    };

    if (!parsed || typeof parsed.expiresAt !== "number" || parsed.expiresAt <= Date.now()) {
      await LocalStorage.removeItem(AUTH_STATUS_STORAGE_KEY);
      return null;
    }

    const account = parsed.account ?? null;
    if (!account || account.type !== "chatgpt" || !account.email?.trim()) {
      return null;
    }

    cachedChatGPTAccount = {
      account,
      expiresAt: parsed.expiresAt,
    };

    return account;
  } catch {
    await LocalStorage.removeItem(AUTH_STATUS_STORAGE_KEY);
    return null;
  }
}
