import { Cache, LocalStorage, open } from "@raycast/api";
import { createHash, randomBytes } from "node:crypto";
import { createServer, Server } from "node:http";
import { AccountProfile, StoredTokens } from "../types";
import {
  AUTH_URL,
  CACHE_KEY_AUTH,
  CLIENT_ID,
  DEFAULT_TIMEOUT_MS,
  LOGIN_TIMEOUT_MS,
  PLAN_MAP,
  PROFILE_URL,
  SCOPES,
  STORAGE_KEY_TOKENS,
  TOKEN_URL,
  USER_AGENT,
} from "../utils/constants";

const authCache = new Cache();

let activeRefreshPromise: Promise<string | null> | null = null;
let activeAuthServer: Server | null = null;

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function getStoredTokens(): Promise<StoredTokens | null> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY_TOKENS);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredTokens;
  } catch {
    return null;
  }
}

export async function saveStoredTokens(tokens: StoredTokens): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify(tokens));
  authCache.set(CACHE_KEY_AUTH, "authenticated");
}

export async function removeStoredTokens(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY_TOKENS);
  authCache.set(CACHE_KEY_AUTH, "unauthenticated");
}

export async function fetchProfile(
  token: string,
): Promise<AccountProfile | null> {
  try {
    const response = await fetch(PROFILE_URL, {
      headers: {
        "User-Agent": USER_AGENT,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      organization?: {
        name?: string;
        organization_type?: string;
        rate_limit_tier?: string;
      };
      account?: {
        email?: string;
        email_address?: string;
        subscription_type?: string;
      };
    };

    const orgType =
      data.organization?.organization_type || data.account?.subscription_type;
    const plan = orgType
      ? (PLAN_MAP[orgType] ?? orgType.replace(/^claude_/, ""))
      : null;

    return {
      plan,
      organizationName: data.organization?.name ?? null,
      rateLimitTier: data.organization?.rate_limit_tier ?? null,
      email: data.account?.email ?? data.account?.email_address ?? null,
    };
  } catch {
    return null;
  }
}

async function performTokenRefresh(
  refreshToken: string,
  currentProfile?: AccountProfile | null,
  currentPlan?: string | null,
): Promise<string | null> {
  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
      }),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (!response.ok) {
      if (response.status === 400 || response.status === 401) {
        await removeStoredTokens();
      }
      return null;
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    const newTokens: StoredTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
      plan: currentPlan ?? currentProfile?.plan ?? null,
      profile: currentProfile,
    };

    await saveStoredTokens(newTokens);
    return newTokens.accessToken;
  } catch {
    return null;
  }
}

export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await getStoredTokens();
  if (!tokens) return null;

  // If token is valid for at least 5 more minutes, use it
  if (Date.now() < tokens.expiresAt - 5 * 60 * 1000) {
    return tokens.accessToken;
  }

  // Deduplicate in-flight token refresh promises to prevent race conditions
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = performTokenRefresh(
    tokens.refreshToken,
    tokens.profile,
    tokens.plan,
  ).finally(() => {
    activeRefreshPromise = null;
  });

  return activeRefreshPromise;
}

export async function loginWithClaude(): Promise<boolean> {
  // If an auth flow is already listening, close it before starting a fresh one
  if (activeAuthServer) {
    try {
      activeAuthServer.close();
    } catch {
      // Ignore cleanup error
    }
    activeAuthServer = null;
  }

  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  const state = randomBytes(16).toString("hex");

  let allocatedPort = 0;

  try {
    const code = await new Promise<string>((resolve, reject) => {
      let serverInstance: Server | null = null;

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Login timed out. Please try again."));
      }, LOGIN_TIMEOUT_MS);

      function cleanup() {
        clearTimeout(timeout);
        if (serverInstance) {
          try {
            serverInstance.close();
          } catch {
            // Ignore server close errors
          }
          serverInstance = null;
        }
        activeAuthServer = null;
      }

      serverInstance = createServer((req, res) => {
        try {
          const reqUrl = new URL(req.url ?? "", "http://localhost");
          if (reqUrl.pathname !== "/callback") {
            res.writeHead(404);
            res.end();
            return;
          }

          const queryCode = reqUrl.searchParams.get("code");
          const queryState = reqUrl.searchParams.get("state");
          const queryError = reqUrl.searchParams.get("error");

          if (queryError || queryState !== state || !queryCode) {
            const safeError = escapeHtml(
              queryError ?? "Invalid state parameter.",
            );
            res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
            res.end(`<!DOCTYPE html><html><body style="font-family:system-ui;text-align:center;padding:48px;">
              <h2>Authorization Failed</h2>
              <p>${safeError}</p>
            </body></html>`);
            cleanup();
            reject(new Error(queryError ?? "Invalid state parameter"));
            return;
          }

          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`<!DOCTYPE html><html><body style="font-family:system-ui;text-align:center;padding:48px;background:#f5f5f7;">
            <h2 style="color:#1d1d1f;">Authentication Successful</h2>
            <p style="color:#6e6e73;">You can close this window and return to Raycast.</p>
          </body></html>`);

          cleanup();
          resolve(queryCode);
        } catch (err) {
          cleanup();
          reject(err);
        }
      });

      activeAuthServer = serverInstance;

      serverInstance.listen(0, "127.0.0.1", () => {
        const addr = serverInstance?.address();
        if (!addr || typeof addr === "string") {
          cleanup();
          reject(new Error("Failed to allocate local port"));
          return;
        }

        allocatedPort = addr.port;
        const redirectUri = `http://localhost:${allocatedPort}/callback`;

        const authUrl = new URL(AUTH_URL);
        authUrl.searchParams.set("code", "true");
        authUrl.searchParams.set("client_id", CLIENT_ID);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("scope", SCOPES);
        authUrl.searchParams.set("code_challenge", codeChallenge);
        authUrl.searchParams.set("code_challenge_method", "S256");
        authUrl.searchParams.set("state", state);

        open(authUrl.toString());
      });
    });

    const redirectUri = `http://localhost:${allocatedPort}/callback`;

    const exchangeResponse = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: CLIENT_ID,
        code_verifier: codeVerifier,
        state,
      }),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (!exchangeResponse.ok) {
      throw new Error(`Token exchange failed (${exchangeResponse.statusText})`);
    }

    const tokenData = (await exchangeResponse.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    const profile = await fetchProfile(tokenData.access_token);

    await saveStoredTokens({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
      plan: profile?.plan ?? null,
      profile,
    });

    return true;
  } catch (error) {
    const serverToClose = activeAuthServer as Server | null;
    if (serverToClose) {
      try {
        serverToClose.close();
      } catch {
        // Ignore close errors
      }
      activeAuthServer = null;
    }
    throw error;
  }
}
