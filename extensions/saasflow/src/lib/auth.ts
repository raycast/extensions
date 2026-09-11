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
        throw new Error(`OAuth refresh failed (${res.status}): ${await res.text()}`);
    }
    return (await res.json()) as TokenResponse;
}

/**
 * Pop the Raycast OAuth browser flow, exchange the code for a JWT, and
 * persist tokens in the extension's secure store. Subsequent calls return
 * the cached token (refreshing if it has expired).
 */
async function authorize(): Promise<string> {
    const { apiBaseUrl } = preferences();
    const existing = await oauthClient.getTokens();
    if (existing?.accessToken) {
        if (existing.isExpired()) {
            if (existing.refreshToken) {
                const refreshed = await refreshAccessToken({
                    baseUrl: apiBaseUrl,
                    refreshToken: existing.refreshToken,
                });
                await oauthClient.setTokens(refreshed);
                return refreshed.access_token;
            }
            // No refresh token — fall through to a new authorization flow.
        } else {
            return existing.accessToken;
        }
    }
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
