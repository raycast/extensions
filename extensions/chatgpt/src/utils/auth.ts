import { getPreferenceValues, LocalStorage, open } from "@raycast/api";
import fetch from "cross-fetch";
import { createHash, randomBytes } from "node:crypto";
import * as http from "node:http";

const CODEXAUTH_SESSION_STORAGE_KEY = "codexauth-session";

const OAUTH_ISSUER = "https://auth.openai.com";
const OAUTH_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const OAUTH_CALLBACK_PORT = 1455;
const OAUTH_CALLBACK_PATH = "/auth/callback";
const OAUTH_CALLBACK_URI = `http://localhost:${OAUTH_CALLBACK_PORT}${OAUTH_CALLBACK_PATH}`;
const OAUTH_ORIGINATOR = "codex_cli_rs";

const OAUTH_TIMEOUT_MS = 5 * 60 * 1000;

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

export function getConfiguredApiKey(preferences?: Preferences): string {
  const config = preferences ?? getPreferenceValues<Preferences>();
  return (config.apiKey ?? "").trim();
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
  const apiKey = getConfiguredApiKey(config);
  const hasApiKey = apiKey.length > 0;

  const chatGPTSession = await getCodexAuthSession();
  const hasChatGPTSession = !!chatGPTSession;

  if (config.useAzure && hasApiKey) {
    return {
      provider: "apiKey",
      hasApiKey,
      hasChatGPTSession,
      apiKey,
      session: chatGPTSession,
    };
  }

  const provider: AuthProvider = hasChatGPTSession ? "chatgpt" : hasApiKey ? "apiKey" : "none";
  return {
    provider,
    hasApiKey,
    hasChatGPTSession,
    apiKey,
    session: chatGPTSession,
  };
}

export async function signInWithCodexAuth(): Promise<CodexAuthSession> {
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

  const tokens = await exchangeAuthorizationCode(code, verifier);
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

async function exchangeAuthorizationCode(code: string, verifier: string): Promise<TokenExchangeResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: OAUTH_CALLBACK_URI,
    client_id: OAUTH_CLIENT_ID,
    code_verifier: verifier,
  });

  const response = await fetch(`${OAUTH_ISSUER}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const details = await parseOAuthError(response);
    throw new Error(`Token exchange failed (${response.status}): ${details}`);
  }

  const payload = (await response.json()) as TokenExchangeResponse;
  return payload;
}

async function parseOAuthError(response: Awaited<ReturnType<typeof fetch>>): Promise<string> {
  try {
    const payload = (await response.json()) as {
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
    // ignore
  }

  return response.statusText || "Unknown OAuth error";
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
