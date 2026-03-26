import { getPreferenceValues, LocalStorage, open } from "@raycast/api";
import { createHash, randomBytes } from "node:crypto";
import * as http from "node:http";
import * as https from "node:https";
import { Agent } from "node:http";
import { ProxyAgent } from "proxy-agent";

const CODEXAUTH_SESSION_STORAGE_KEY = "codexauth-session";

const OAUTH_ISSUER = "https://auth.openai.com";
const OAUTH_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const OAUTH_CALLBACK_PORT = 1455;
const OAUTH_CALLBACK_PATH = "/auth/callback";
const OAUTH_CALLBACK_URI = `http://localhost:${OAUTH_CALLBACK_PORT}${OAUTH_CALLBACK_PATH}`;
const OAUTH_ORIGINATOR = "codex_cli_rs";

const OAUTH_TIMEOUT_MS = 5 * 60 * 1000;
const ACCESS_TOKEN_REFRESH_SKEW_MS = 60 * 1000;

let refreshSessionPromise: Promise<CodexAuthSession> | null = null;

export type AuthProvider = "none" | "apiKey" | "chatgpt";

export interface CodexAuthSession {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  accountId: string;
  updatedAt: string;
}

export interface AuthStatus {
  provider: AuthProvider;
  hasApiKey: boolean;
  hasChatGPTSession: boolean;
  apiKey: string;
  session: CodexAuthSession | null;
}

interface TokenExchangeResponse {
  id_token?: string;
  access_token?: string;
  refresh_token?: string;
}

interface ProxyPreferences {
  useProxy?: boolean;
  proxyProtocol?: string;
  proxyHost?: string;
  proxyPort?: number;
  proxyUsername?: string;
  proxyPassword?: string;
}

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

export async function getCodexAuthSession(): Promise<CodexAuthSession | null> {
  const raw = await LocalStorage.getItem<string>(CODEXAUTH_SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CodexAuthSession>;
    if (
      !parsed ||
      typeof parsed.idToken !== "string" ||
      typeof parsed.accessToken !== "string" ||
      typeof parsed.refreshToken !== "string" ||
      typeof parsed.accountId !== "string" ||
      typeof parsed.updatedAt !== "string"
    ) {
      return null;
    }

    const session: CodexAuthSession = {
      idToken: parsed.idToken.trim(),
      accessToken: parsed.accessToken.trim(),
      refreshToken: parsed.refreshToken.trim(),
      accountId: parsed.accountId.trim(),
      updatedAt: parsed.updatedAt,
    };

    if (!session.accessToken || !session.accountId) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export async function saveCodexAuthSession(session: CodexAuthSession): Promise<void> {
  await LocalStorage.setItem(CODEXAUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export async function clearCodexAuthSession(): Promise<void> {
  await LocalStorage.removeItem(CODEXAUTH_SESSION_STORAGE_KEY);
}

export async function resolveAuthStatus(preferences?: Preferences): Promise<AuthStatus> {
  const config = preferences ?? getPreferenceValues<Preferences>();
  const initial = getInitialAuthStatus(config);

  const chatGPTSession = await getCodexAuthSession();
  const hasChatGPTSession = !!chatGPTSession;

  // API key takes precedence when both auth methods exist.
  const provider: AuthProvider = initial.hasApiKey ? "apiKey" : hasChatGPTSession ? "chatgpt" : "none";
  return {
    provider,
    hasApiKey: initial.hasApiKey,
    hasChatGPTSession,
    apiKey: initial.apiKey,
    session: chatGPTSession,
  };
}

export async function getCodexAuthSessionWithRefresh(options?: {
  forceRefresh?: boolean;
  preferences?: Preferences;
}): Promise<CodexAuthSession | null> {
  const session = await getCodexAuthSession();
  if (!session) {
    return null;
  }

  const shouldRefresh = options?.forceRefresh || isTokenNearExpiry(session.accessToken, ACCESS_TOKEN_REFRESH_SKEW_MS);
  if (!shouldRefresh) {
    return session;
  }

  return refreshCodexAuthSession(session, options?.preferences);
}

export async function refreshCodexAuthSession(
  existingSession?: CodexAuthSession,
  preferences?: Preferences,
): Promise<CodexAuthSession> {
  if (refreshSessionPromise) {
    return refreshSessionPromise;
  }

  refreshSessionPromise = (async () => {
    const session = existingSession ?? (await getCodexAuthSession());
    if (!session) {
      throw new Error("No ChatGPT session found. Please sign in again.");
    }

    if (!session.refreshToken.trim()) {
      await clearCodexAuthSession();
      throw new Error("ChatGPT refresh token is missing. Please sign in again.");
    }

    try {
      const proxyAgent = createProxyAgentFromPreferences(
        (preferences ?? getPreferenceValues<Preferences>()) as ProxyPreferences,
      );
      const tokens = await exchangeRefreshToken(session.refreshToken, proxyAgent);

      const accessToken = (tokens.access_token ?? "").trim();
      const refreshToken = (tokens.refresh_token ?? session.refreshToken).trim();
      const idToken = (tokens.id_token ?? session.idToken).trim();

      if (!accessToken || !refreshToken) {
        throw new Error("Token refresh did not return a valid access token.");
      }

      const accountId = parseAccountIdFromIdToken(idToken) ?? session.accountId;
      if (!accountId) {
        throw new Error("Token refresh completed but account metadata was missing.");
      }

      const updatedSession: CodexAuthSession = {
        idToken,
        accessToken,
        refreshToken,
        accountId,
        updatedAt: new Date().toISOString(),
      };

      await saveCodexAuthSession(updatedSession);
      return updatedSession;
    } catch (error) {
      if (isInvalidGrantError(error)) {
        await clearCodexAuthSession();
        throw new Error("Your ChatGPT session expired. Please sign in again.");
      }

      throw error;
    }
  })();

  try {
    return await refreshSessionPromise;
  } finally {
    refreshSessionPromise = null;
  }
}

export async function signInWithCodexAuth(): Promise<CodexAuthSession> {
  const preferences = getPreferenceValues<Preferences>() as Preferences & ProxyPreferences;
  const proxyAgent = createProxyAgentFromPreferences(preferences);

  const state = randomBase64Url(32);
  const verifier = randomBase64Url(64);
  const challenge = sha256Base64Url(verifier);

  const callbackPromise = waitForOAuthCallback(state, OAUTH_TIMEOUT_MS);
  const authURL = buildAuthorizationURL(state, challenge);

  if (!authURL) {
    throw new Error("Could not start ChatGPT sign-in.");
  }

  await open(authURL.toString());

  const callbackURL = await callbackPromise;
  const params = callbackURL.searchParams;

  const error = params.get("error");
  if (error) {
    const details = params.get("error_description") ?? error;
    throw new Error(`Sign-in was denied: ${details}`);
  }

  const callbackState = params.get("state");
  if (!callbackState || callbackState !== state) {
    throw new Error("Sign-in failed because the callback state did not match.");
  }

  const code = params.get("code");
  if (!code) {
    throw new Error("Sign-in failed because the authorization code was missing.");
  }

  const tokens = await exchangeAuthorizationCode(code, verifier, proxyAgent);
  const idToken = (tokens.id_token ?? "").trim();
  const accessToken = (tokens.access_token ?? "").trim();
  const refreshToken = (tokens.refresh_token ?? "").trim();

  if (!idToken || !accessToken || !refreshToken) {
    throw new Error("Sign-in failed because OAuth tokens were missing from the response.");
  }

  const accountId = parseAccountIdFromIdToken(idToken);
  if (!accountId) {
    throw new Error("Sign-in succeeded, but ChatGPT account metadata was missing.");
  }

  const session: CodexAuthSession = {
    idToken,
    accessToken,
    refreshToken,
    accountId,
    updatedAt: new Date().toISOString(),
  };

  await saveCodexAuthSession(session);
  return session;
}

function buildAuthorizationURL(state: string, challenge: string): URL | null {
  const url = new URL(`${OAUTH_ISSUER}/oauth/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", OAUTH_CLIENT_ID);
  url.searchParams.set("redirect_uri", OAUTH_CALLBACK_URI);
  url.searchParams.set("scope", "openid profile email offline_access");
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("id_token_add_organizations", "true");
  url.searchParams.set("codex_cli_simplified_flow", "true");
  url.searchParams.set("originator", OAUTH_ORIGINATOR);
  url.searchParams.set("state", state);
  return url;
}

function waitForOAuthCallback(expectedState: string, timeoutMs: number): Promise<URL> {
  return new Promise<URL>((resolve, reject) => {
    const server = http.createServer();
    let finished = false;

    const finish = (result: { url?: URL; error?: Error }) => {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(timer);
      server.close(() => {
        if (result.error) {
          reject(result.error);
          return;
        }
        if (!result.url) {
          reject(new Error("Sign-in callback URL was missing."));
          return;
        }
        resolve(result.url);
      });
    };

    const timer = setTimeout(() => {
      finish({ error: new Error("Sign-in timed out. Please try again.") });
    }, timeoutMs);

    server.on("error", (error) => {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "EADDRINUSE") {
        finish({
          error: new Error(`Could not start local callback server on port ${OAUTH_CALLBACK_PORT}. The port is in use.`),
        });
        return;
      }
      finish({ error: new Error(`Could not start local callback server: ${error.message}`) });
    });

    server.on("request", (req, res) => {
      const requestURL = new URL(req.url ?? "/", OAUTH_CALLBACK_URI);

      if (requestURL.pathname !== OAUTH_CALLBACK_PATH) {
        sendOAuthResponse(res, 404, "Route not found.");
        return;
      }

      const queryState = requestURL.searchParams.get("state");
      const queryError = requestURL.searchParams.get("error");
      const queryErrorDescription = requestURL.searchParams.get("error_description") ?? queryError ?? "";

      if (queryState !== expectedState) {
        sendOAuthResponse(res, 400, "State verification failed. Please retry sign-in.");
      } else if (queryError) {
        sendOAuthResponse(res, 400, `Sign-in failed: ${queryErrorDescription}`);
      } else {
        sendOAuthResponse(res, 200, "Sign-in completed. You can close this tab.");
      }

      finish({ url: requestURL });
    });

    server.listen(OAUTH_CALLBACK_PORT, "127.0.0.1");
  });
}

function sendOAuthResponse(response: http.ServerResponse<http.IncomingMessage>, statusCode: number, message: string) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>ChatGPT Sign-In</title></head><body>${message}</body></html>`;
  response.statusCode = statusCode;
  response.setHeader("content-type", "text/html; charset=utf-8");
  response.end(html);
}

async function exchangeAuthorizationCode(
  code: string,
  verifier: string,
  proxyAgent?: Agent,
): Promise<TokenExchangeResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: OAUTH_CALLBACK_URI,
    client_id: OAUTH_CLIENT_ID,
    code_verifier: verifier,
  });

  return exchangeOAuthToken(body.toString(), proxyAgent);
}

async function exchangeRefreshToken(refreshToken: string, proxyAgent?: Agent): Promise<TokenExchangeResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: OAUTH_CLIENT_ID,
  });

  return exchangeOAuthToken(body.toString(), proxyAgent);
}

async function exchangeOAuthToken(formBody: string, proxyAgent?: Agent): Promise<TokenExchangeResponse> {
  const response = await postOAuthForm(formBody, proxyAgent);
  const responseText = await readIncomingMessageText(response);

  if (!isHttpSuccess(response.statusCode)) {
    const details = parseOAuthError(responseText) ?? response.statusMessage ?? "Unknown OAuth error";
    throw new Error(`Token exchange failed (${response.statusCode ?? 0}): ${details}`);
  }

  try {
    return JSON.parse(responseText) as TokenExchangeResponse;
  } catch {
    throw new Error("Token exchange failed: invalid JSON response from OAuth server.");
  }
}

function postOAuthForm(formBody: string, proxyAgent?: Agent): Promise<http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    const request = https.request(
      `${OAUTH_ISSUER}/oauth/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(formBody).toString(),
          Accept: "application/json",
        },
        agent: proxyAgent,
      },
      (response) => {
        resolve(response);
      },
    );

    request.on("error", reject);
    request.write(formBody);
    request.end();
  });
}

function isHttpSuccess(statusCode?: number): boolean {
  return typeof statusCode === "number" && statusCode >= 200 && statusCode < 300;
}

async function readIncomingMessageText(response: http.IncomingMessage): Promise<string> {
  const chunks: string[] = [];

  for await (const chunk of response) {
    chunks.push(toUTF8(chunk));
  }

  return chunks.join("");
}

function parseOAuthError(responseText: string): string | null {
  const trimmed = responseText.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const payload = JSON.parse(trimmed) as {
      error?: string | { message?: string };
      error_description?: string;
      detail?: string;
    };

    const errorDescription = payload.error_description?.trim();
    if (errorDescription) {
      return errorDescription;
    }

    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error.trim();
    }

    const nestedMessage =
      typeof payload.error === "object" && payload.error && "message" in payload.error
        ? payload.error.message
        : undefined;
    if (nestedMessage?.trim()) {
      return nestedMessage.trim();
    }

    if (payload.detail?.trim()) {
      return payload.detail.trim();
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

function parseAccountIdFromIdToken(idToken: string): string | null {
  const parts = idToken.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as {
      "https://api.openai.com/auth"?: {
        chatgpt_account_id?: string;
      };
    };

    const accountId = payload["https://api.openai.com/auth"]?.chatgpt_account_id?.trim();
    return accountId || null;
  } catch {
    return null;
  }
}

function isTokenNearExpiry(token: string, skewMs: number): boolean {
  const expiryMs = parseJwtExpiryMs(token);
  if (!expiryMs) {
    return false;
  }

  return Date.now() + skewMs >= expiryMs;
}

function parseJwtExpiryMs(token: string): number | null {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as { exp?: number };
    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
      return null;
    }

    return payload.exp * 1000;
  } catch {
    return null;
  }
}

function isInvalidGrantError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("invalid_grant") || message.includes("401") || message.includes("expired");
}

function createProxyAgentFromPreferences(preferences: ProxyPreferences): Agent | undefined {
  if (!preferences.useProxy || !preferences.proxyProtocol || !preferences.proxyHost || !preferences.proxyPort) {
    return undefined;
  }

  const authPart =
    preferences.proxyUsername && preferences.proxyPassword
      ? `${encodeURIComponent(preferences.proxyUsername)}:${encodeURIComponent(preferences.proxyPassword)}@`
      : "";
  const proxyUrl = `${preferences.proxyProtocol}://${authPart}${preferences.proxyHost}:${preferences.proxyPort}`;

  return new ProxyAgent({
    getProxyForUrl: () => proxyUrl,
  }) as unknown as Agent;
}

function decodeBase64Url(value: string): string {
  let normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  while (normalized.length % 4 !== 0) {
    normalized += "=";
  }
  return Buffer.from(normalized, "base64").toString("utf8");
}

function randomBase64Url(length: number): string {
  return randomBytes(length).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function sha256Base64Url(input: string): string {
  return createHash("sha256")
    .update(input)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function toUTF8(chunk: Buffer | Uint8Array | string): string {
  if (typeof chunk === "string") {
    return chunk;
  }

  return Buffer.from(chunk).toString("utf8");
}
