import { OAuth } from "@raycast/api";

import { type Account, clearTokens, listAccounts, newAccount, readTokens, saveAccount, saveTokens } from "./accounts";

// Hackban's OAuth server (src/server/oauth.ts in hackban) registers clients on the fly (RFC 7591)
// and gives them "mcp" tokens, which work on /api/mcp. Access tokens last an hour; refresh
// tokens are single-use, and presenting a spent one revokes the whole grant.

// Only drives the browser round trip; tokens are kept per account in ./accounts.
const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Hackban",
  providerIcon: "icon.png",
  providerId: "hackban",
  description: "Connect your Hackban account to see and edit your boards from Raycast.",
});

/** The account's tokens are gone or were turned down: it needs signing in again. */
export class SignedOutError extends Error {
  constructor(readonly account: Account) {
    super(`Sign in to ${account.label} again`);
  }
}

async function register(server: string, redirectUri: string) {
  const res = await fetch(`${server}/api/oauth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "Raycast",
      redirect_uris: [redirectUri],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    }),
  });
  if (!res.ok) throw new Error(`Couldn't register with ${server} (${res.status})`);
  return ((await res.json()) as { client_id: string }).client_id;
}

/** POSTs to the token endpoint; null when the server turns the grant down. */
async function requestTokens(server: string, params: Record<string, string>) {
  const res = await fetch(`${server}/api/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  if (res.status === 400 || res.status === 401) return null;
  if (!res.ok) throw new Error(`Hackban's token endpoint returned ${res.status}`);
  const t = (await res.json()) as OAuth.TokenResponse;
  return {
    accessToken: t.access_token,
    refreshToken: t.refresh_token ?? "",
    expiresAt: Date.now() + (t.expires_in ?? 3600) * 1000,
  };
}

/**
 * Signs in to `server` in the browser. Signing in to a server that already has an account
 * replaces that account's tokens (and its label, if one is given), as in Hackban for Mac.
 */
export async function signIn(server: string, label?: string): Promise<Account> {
  const endpoint = `${server}/oauth/authorize`;
  const request = await client.authorizationRequest({ endpoint, clientId: "pending", scope: "mcp" });
  // A fresh registration each sign-in: Hackban sweeps registrations that never got a token.
  const clientId = await register(server, request.redirectURI);
  const url = new URL(request.toURL());
  url.searchParams.set("client_id", clientId);
  const { authorizationCode } = await client.authorize({ url: url.toString() });
  const tokens = await requestTokens(server, {
    grant_type: "authorization_code",
    code: authorizationCode,
    code_verifier: request.codeVerifier,
    redirect_uri: request.redirectURI,
    client_id: clientId,
  });
  if (!tokens) throw new Error("Hackban didn't accept the sign-in. Try again.");

  const accounts = await listAccounts();
  const existing = accounts.find((a) => a.server === server);
  // This may be someone else signing in, so forget who the account was; it's looked up again.
  const account = existing
    ? { ...existing, clientId, label: label || existing.label, userId: undefined, userName: undefined }
    : newAccount(accounts, server, clientId, label);
  await saveTokens(account.id, tokens);
  await saveAccount(account);
  return account;
}

async function freshToken(account: Account, force: boolean) {
  const tokens = await readTokens(account.id);
  if (!tokens) throw new SignedOutError(account);
  if (!force && tokens.expiresAt - 60_000 > Date.now()) return tokens.accessToken;
  const fresh = await requestTokens(account.server, {
    grant_type: "refresh_token",
    refresh_token: tokens.refreshToken,
    client_id: account.clientId,
  });
  if (!fresh) {
    await clearTokens(account.id);
    throw new SignedOutError(account);
  }
  await saveTokens(account.id, fresh);
  return fresh.accessToken;
}

// One refresh per account at a time: two at once would spend the same refresh token twice.
const pending = new Map<string, Promise<string>>();

/** A working access token for `account`, refreshed if it's about to expire (or if `force`). */
export function accessToken(account: Account, force = false): Promise<string> {
  let token = pending.get(account.id);
  if (!token) {
    token = freshToken(account, force).finally(() => pending.delete(account.id));
    pending.set(account.id, token);
  }
  return token;
}

/** Whether the account still has tokens, without touching the network. */
export async function isSignedIn(account: Account) {
  return !!(await readTokens(account.id));
}
