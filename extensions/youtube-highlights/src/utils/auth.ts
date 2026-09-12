import { OAuth } from "@raycast/api";
import { jwtDecode } from "jwt-decode";

interface UserToken {
  user_id: string;
  sub: string;
  email?: string;
  is_pro?: boolean;
  name?: string;
  exp: number;
}

const BASE_URL = "https://auth.youtubehighlightsapp.com";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.AppURI,
  providerName: "YouTube Highlights",
  providerIcon: "extension-icon-big.png",
  providerId: "youtube-highlights",
  description: "Connect your account to enable backup (free) and sync (pro) of your highlights.",
});

export async function authorize(): Promise<string> {
  const tokenSet = await client.getTokens();

  if (tokenSet?.accessToken) {
    if (tokenSet.isExpired()) {
      if (tokenSet.refreshToken) {
        try {
          const response = await fetch(`${BASE_URL}/api/auth/token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "refresh_token",
              refresh_token: tokenSet.refreshToken,
              client_id: "raycast",
            }).toString(),
          });

          if (!response.ok) {
            throw new Error(`Refresh failed: ${response.statusText}`);
          }

          const newTokens = (await response.json()) as OAuth.TokenResponse;
          await client.setTokens(newTokens);
          return newTokens.access_token;
        } catch {
          // Refresh failed
        }
      }
    } else {
      return tokenSet.accessToken;
    }
  }

  const authRequest = await client.authorizationRequest({
    endpoint: `${BASE_URL}/auth/authorize`,
    clientId: "raycast",
    scope: "",
  });

  const { authorizationCode } = await client.authorize(authRequest);

  const tokenUrl = `${BASE_URL}/api/auth/token`;
  const requestBody = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: "raycast",
    code: authorizationCode,
    code_verifier: authRequest.codeVerifier,
    redirect_uri: authRequest.redirectURI,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: requestBody.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }

  const tokens = (await response.json()) as OAuth.TokenResponse;
  await client.setTokens(tokens);

  return tokens.access_token;
}

export async function getAccessToken(): Promise<string | undefined> {
  const tokenSet = await client.getTokens();

  if (tokenSet?.accessToken) {
    if (tokenSet.isExpired()) {
      if (tokenSet.refreshToken) {
        try {
          const response = await fetch(`${BASE_URL}/api/auth/token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "refresh_token",
              refresh_token: tokenSet.refreshToken,
              client_id: "raycast",
            }).toString(),
          });

          if (!response.ok) {
            return undefined;
          }

          const newTokens = (await response.json()) as OAuth.TokenResponse;
          await client.setTokens(newTokens);
          return newTokens.access_token;
        } catch {
          return undefined;
        }
      }
      return undefined;
    }
    return tokenSet.accessToken;
  }
  return undefined;
}

const API_BASE_URL = "https://api.youtubehighlightsapp.com";
const PRO_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let proStatusCache: { value: boolean; timestamp: number } | null = null;

export async function logout() {
  proStatusCache = null;
  await client.removeTokens();
}

async function fetchProStatusFromAPI(): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;

  const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) return false;

  const data = (await response.json()) as { data?: { isPro?: boolean } };
  return data.data?.isPro === true;
}

export async function isProUser(): Promise<boolean> {
  try {
    const token = await getAccessToken();
    if (!token) {
      proStatusCache = null;
      return false;
    }

    const now = Date.now();
    if (proStatusCache && now - proStatusCache.timestamp < PRO_CACHE_TTL) {
      return proStatusCache.value;
    }

    const isPro = await fetchProStatusFromAPI();
    proStatusCache = { value: isPro, timestamp: now };
    return isPro;
  } catch {
    return proStatusCache?.value ?? false;
  }
}

export function clearProStatusCache(): void {
  proStatusCache = null;
}

export async function getUser(): Promise<{ uid: string; email?: string; is_pro?: boolean; name?: string } | null> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return null;
    }

    const decoded = jwtDecode<UserToken>(token);

    return {
      uid: decoded.user_id,
      email: decoded.email,
      is_pro: decoded.is_pro,
      name: decoded.name,
    };
  } catch {
    return null;
  }
}
