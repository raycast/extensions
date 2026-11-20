import { OAuth } from "@raycast/api";
import type { Auth } from "@saasflow/api-client";
import { preferences } from "./preferences.js";

const CLIENT_ID = "raycast-extension";

const SCOPES = ["openid", "profile", "email", "offline_access", "saasflow:read"];

/**
 * RFC 8707 audience indicator. Better Auth's oauth-provider only mints
 * JWT-formatted access tokens when it sees a `resource` on the /token
 * request, and the API's bearer middleware only accepts tokens whose `aud`
 * matches the API resource — `publicApp` is gated by
 * `requireOauthAudience(getApiResource)`, which rejects MCP-audience
 * tokens to keep /mcp connector tokens from reaching /companies/*.
 */
const resourceFor = (baseUrl: string): string => baseUrl.replace(/\/$/, "");

const oauthClient = new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.Web,
    providerName: "SaaSFlow",
    providerId: "saasflow",
    providerIcon: "extension-icon.png",
    description: "Sign in with your SaaSFlow account.",
});

interface TokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
    token_type?: string;
}

async function exchangeCode(opts: {
    baseUrl: string;
    code: string;
    codeVerifier: string;
    redirectUri: string;
}): Promise<OAuth.TokenResponse> {
    const body = new URLSearchParams({
        grant_type: "authorization_code",
        code: opts.code,
        redirect_uri: opts.redirectUri,
        client_id: CLIENT_ID,
        code_verifier: opts.codeVerifier,
        resource: resourceFor(opts.baseUrl),
    });
    const res = await fetch(`${opts.baseUrl}/auth/oauth2/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: body.toString(),
    });
    if (!res.ok) {
        throw new Error(`OAuth token exchange failed (${res.status}): ${await res.text()}`);
    }
    return (await res.json()) as TokenResponse;
}

async function refreshAccessToken(opts: { baseUrl: string; refreshToken: string }): Promise<OAuth.TokenResponse> {
    const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: opts.refreshToken,
        client_id: CLIENT_ID,
        resource: resourceFor(opts.baseUrl),
    });
    const res = await fetch(`${opts.baseUrl}/auth/oauth2/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: body.toString(),
    });
    if (!res.ok) {
        const message = `OAuth refresh failed (${res.status}): ${await res.text()}`;
        // 400 (invalid_grant) and 401 (invalid_client) mean the refresh token
        // will never work again; anything else (5xx, a proxy) may be transient.
        throw res.status === 400 || res.status === 401 ? new RefreshRejectedError(message) : new Error(message);
    }
    return (await res.json()) as TokenResponse;
}

/** The token endpoint rejected the refresh token: it was revoked or has expired. */
class RefreshRejectedError extends Error {}

/**
 * A usable access token from the secure store, refreshed if it has expired,
 * or null when only a new browser sign-in can help. Never opens the browser.
 * A refresh token the server rejects is removed, so the next sign-in starts
 * from scratch instead of failing on it again.
 */
async function storedAccessToken(): Promise<string | null> {
    const existing = await oauthClient.getTokens();
    if (!existing?.accessToken) return null;
    if (!existing.isExpired()) return existing.accessToken;
    if (!existing.refreshToken) return null;
    try {
        const refreshed = await refreshAccessToken({
            baseUrl: preferences().apiBaseUrl,
            refreshToken: existing.refreshToken,
        });
        // Keep the old refresh token when the server does not rotate it.
        await oauthClient.setTokens({
            ...refreshed,
            refresh_token: refreshed.refresh_token ?? existing.refreshToken,
        });
        return refreshed.access_token;
    } catch (error) {
        if (!(error instanceof RefreshRejectedError)) throw error;
        console.warn("Stored SaaSFlow sign-in was rejected; signing in again is needed.", error);
        await oauthClient.removeTokens();
        return null;
    }
}

/**
 * Return the stored token (refreshing it if it has expired), or pop the
 * Raycast OAuth browser flow, exchange the code for a JWT, and persist the
 * tokens in the extension's secure store.
 */
async function authorize(): Promise<string> {
    const stored = await storedAccessToken();
    if (stored) return stored;
    const { apiBaseUrl } = preferences();
    const authRequest = await oauthClient.authorizationRequest({
        endpoint: `${apiBaseUrl}/auth/oauth2/authorize`,
        clientId: CLIENT_ID,
        scope: SCOPES.join(" "),
        extraParameters: { resource: resourceFor(apiBaseUrl) },
    });
    const { authorizationCode } = await oauthClient.authorize(authRequest);
    const tokens = await exchangeCode({
        baseUrl: apiBaseUrl,
        code: authorizationCode,
        codeVerifier: authRequest.codeVerifier,
        redirectUri: authRequest.redirectURI,
    });
    await oauthClient.setTokens(tokens);
    return tokens.access_token;
}

/** Wipe stored OAuth tokens — exposed for a future "sign out" command. */
export async function signOut(): Promise<void> {
    await oauthClient.removeTokens();
}

/**
 * Whether a request can be made without a browser round-trip: an API key is
 * configured, or a stored OAuth token is valid or was just refreshed. A
 * refresh token the server rejects counts as signed out (and is removed).
 * Background launches check this first, because they cannot show the OAuth
 * sign-in.
 */
export async function hasStoredCredentials(): Promise<boolean> {
    if (preferences().apiKey) return true;
    return (await storedAccessToken()) !== null;
}

/**
 * Resolve the auth payload the api-client expects. The configured API key
 * wins when present (no browser round-trip needed); otherwise we fall back
 * to the OAuth flow.
 */
export async function getAuth(): Promise<Auth> {
    const { apiKey } = preferences();
    if (apiKey) {
        return { kind: "apiKey", key: apiKey };
    }
    const token = await authorize();
    return { kind: "oauthBearer", token };
}
