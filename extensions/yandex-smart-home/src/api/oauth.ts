/**
 * Yandex OAuth: verification code flow.
 * redirect_uri = https://oauth.yandex.ru/verification_code — code is shown on page, user pastes it.
 */

import { OAuth } from "@raycast/api";
import * as crypto from "crypto";

const YANDEX_AUTHORIZE = "https://oauth.yandex.com/authorize";
const YANDEX_TOKEN = "https://oauth.yandex.com/token";
const YANDEX_VERIFICATION_CODE_REDIRECT =
  "https://oauth.yandex.ru/verification_code";
const SCOPE = "iot:view iot:control";

export const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Yandex",
  providerIcon: "icon.png",
  description: "Connect your Yandex account to control Smart Home devices.",
});

export type OAuthPrefs = {
  clientId?: string;
  redirectUri?: string;
};

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function generatePKCE(): {
  codeVerifier: string;
  codeChallenge: string;
} {
  const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
  const codeChallenge = base64UrlEncode(
    crypto.createHash("sha256").update(codeVerifier).digest(),
  );
  return { codeVerifier, codeChallenge };
}

export function getYandexVerificationCodeAuthUrl(
  clientId: string,
  codeChallenge: string,
  state: string,
  redirectUri?: string,
): string {
  const uri = (redirectUri?.trim() || YANDEX_VERIFICATION_CODE_REDIRECT).trim();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: uri,
    scope: SCOPE,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `${YANDEX_AUTHORIZE}?${params.toString()}`;
}

export async function exchangeYandexCode(
  code: string,
  codeVerifier: string,
  clientId: string,
  redirectUri?: string,
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}> {
  const uri = (redirectUri?.trim() || YANDEX_VERIFICATION_CODE_REDIRECT).trim();
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code: code.trim(),
    code_verifier: codeVerifier,
    client_id: clientId,
    redirect_uri: uri,
  });
  const res = await fetch(YANDEX_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };
  return data;
}

export async function refreshYandexTokens(
  refreshToken: string,
  clientId: string,
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}> {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });
  const res = await fetch(YANDEX_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };
  return data;
}

export async function getYandexAccessToken(
  clientId: string,
): Promise<string | null> {
  const tokenSet = await client.getTokens();
  if (!tokenSet?.accessToken) return null;
  if (tokenSet.refreshToken && tokenSet.isExpired?.()) {
    const fresh = await refreshYandexTokens(tokenSet.refreshToken, clientId);
    await client.setTokens({
      access_token: fresh.access_token,
      refresh_token: fresh.refresh_token ?? tokenSet.refreshToken,
      expires_in: fresh.expires_in,
    });
    return fresh.access_token;
  }
  return tokenSet.accessToken;
}
