import { LocalStorage, open } from "@raycast/api";
import * as http from "node:http";
import * as crypto from "node:crypto";
import { log } from "./log";
import {
  OPENAI_CLIENT_ID,
  OPENAI_AUTHORIZE_URL,
  OPENAI_TOKEN_URL,
  OPENAI_SCOPE,
  OPENAI_REDIRECT_PORT,
  OPENAI_REDIRECT_URI,
  OPENAI_STORAGE_KEY,
} from "./providers/openai-constants";

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
}

// --- PKCE ---

export function generatePKCE() {
  const bytes = crypto.randomBytes(64);
  const verifier = bytes.toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

// --- Token Exchange ---

async function exchangeCode(code: string, codeVerifier: string): Promise<StoredTokens> {
  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("code", code);
  body.set("redirect_uri", OPENAI_REDIRECT_URI);
  body.set("client_id", OPENAI_CLIENT_ID);
  body.set("code_verifier", codeVerifier);

  log(`Token exchange request to ${OPENAI_TOKEN_URL}`);
  const response = await fetch(OPENAI_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const text = await response.text();
  log(`Token exchange response (${response.status}): ${text.substring(0, 200)}`);

  if (!response.ok) {
    throw new Error(`Token exchange failed (${response.status}): ${text}`);
  }

  const json = JSON.parse(text) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? "",
    expiresAt: json.expires_in ? Date.now() + json.expires_in * 1000 : undefined,
  };
}

async function refreshAccessToken(refreshToken: string): Promise<StoredTokens> {
  const body = new URLSearchParams();
  body.set("client_id", OPENAI_CLIENT_ID);
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", refreshToken);
  body.set("scope", "openid profile email");

  const response = await fetch(OPENAI_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Token refresh failed (${response.status}): ${text}`);
  }

  const json = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt: json.expires_in ? Date.now() + json.expires_in * 1000 : undefined,
  };
}

// --- PKCE OAuth Flow ---

export function startOAuthFlow(): Promise<StoredTokens> {
  const { verifier, challenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString("base64url");

  log(`PKCE generated - verifier length: ${verifier.length}, challenge: ${challenge}`);
  log(`State: ${state}`);

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      log(`Callback received: ${req.method} ${req.url}`);
      try {
        const url = new URL(req.url!, `http://localhost:${OPENAI_REDIRECT_PORT}`);

        if (url.pathname === "/cancel") {
          log("Received cancel request");
          res.writeHead(200);
          res.end("ok");
          server.close();
          reject(new Error("Cancelled by another login attempt"));
          return;
        }

        if (url.pathname !== "/auth/callback") {
          res.writeHead(404);
          res.end();
          return;
        }

        const error = url.searchParams.get("error");
        const errorDesc = url.searchParams.get("error_description");
        if (error) {
          log(`OAuth callback error: ${error} - ${errorDesc}`);
          const esc = (s: string | null) =>
            (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`<html><body><h2>Authentication failed</h2><p>${esc(error)}: ${esc(errorDesc)}</p></body></html>`);
          server.close();
          reject(new Error(`OAuth error: ${error} - ${errorDesc}`));
          return;
        }

        const code = url.searchParams.get("code");
        const returnedState = url.searchParams.get("state");
        log(`Callback: code present=${!!code}, state match=${returnedState === state}`);

        if (returnedState !== state || !code) {
          log(`State mismatch - expected: ${state}, got: ${returnedState}`);
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end("<html><body><h2>Invalid callback</h2></body></html>");
          server.close();
          reject(new Error("Invalid OAuth callback"));
          return;
        }

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          "<html><body style='font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0'>" +
            "<div style='text-align:center'><h2>Authenticated!</h2><p>You can close this tab and return to Raycast.</p></div>" +
            "</body></html>",
        );
        server.close();

        log("Exchanging code for tokens...");
        const tokens = await exchangeCode(code, verifier);
        log(`Token exchange success! accessToken length: ${tokens.accessToken.length}`);
        resolve(tokens);
      } catch (err) {
        log(`Callback handler error: ${err}`);
        server.close();
        reject(err);
      }
    });

    server.on("error", (err) => {
      log(`Server error: ${err}`);
      reject(err);
    });

    server.listen(OPENAI_REDIRECT_PORT, "127.0.0.1", () => {
      log(`Server listening on localhost:${OPENAI_REDIRECT_PORT}`);

      const authUrl = new URL(OPENAI_AUTHORIZE_URL);
      authUrl.searchParams.set("client_id", OPENAI_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", OPENAI_REDIRECT_URI);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", OPENAI_SCOPE);
      authUrl.searchParams.set("code_challenge", challenge);
      authUrl.searchParams.set("code_challenge_method", "S256");
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("id_token_add_organizations", "true");
      authUrl.searchParams.set("codex_cli_simplified_flow", "true");
      authUrl.searchParams.set("originator", "codex_cli_rs");

      const finalUrl = authUrl.toString();
      log(`Opening auth URL: ${finalUrl}`);
      open(finalUrl);
    });

    setTimeout(() => {
      log("OAuth flow timed out");
      server.close();
      reject(new Error("OAuth flow timed out"));
    }, 120_000);
  });
}

// --- Token Storage ---

export async function storeTokens(tokens: StoredTokens): Promise<void> {
  await LocalStorage.setItem(OPENAI_STORAGE_KEY, JSON.stringify(tokens));
}

export async function clearTokens(): Promise<void> {
  await LocalStorage.removeItem(OPENAI_STORAGE_KEY);
}

export async function getValidToken(): Promise<string | null> {
  const raw = await LocalStorage.getItem<string>(OPENAI_STORAGE_KEY);
  if (!raw) return null;
  const tokens = JSON.parse(raw) as StoredTokens;

  if (tokens.expiresAt && tokens.expiresAt > Date.now() + 60_000) {
    return tokens.accessToken;
  }

  if (tokens.refreshToken) {
    try {
      const refreshed = await refreshAccessToken(tokens.refreshToken);
      await storeTokens(refreshed);
      return refreshed.accessToken;
    } catch {
      await LocalStorage.removeItem(OPENAI_STORAGE_KEY);
      return null;
    }
  }

  // No expiry info and no refresh token, return token as-is (server will reject if expired)
  if (!tokens.expiresAt) {
    return tokens.accessToken;
  }

  return null;
}
