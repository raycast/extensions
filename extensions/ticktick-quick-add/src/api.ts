import { OAuth } from "@raycast/api";

const CLIENT_ID = "iS0yXT1Eo3l5IgP7ge";
const CLIENT_SECRET = "5wO6O0J22WXEAwFQkntUD0QOtikXGBNY";
const TICKTICK_API = "https://api.ticktick.com/open/v1";

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "TickTick",
  providerIcon: "icon.png",
  description: "Connect your TickTick account",
});

export async function getAccessToken(): Promise<string> {
  const existingTokens = await oauthClient.getTokens();
  if (existingTokens?.accessToken) {
    if (existingTokens.refreshToken && existingTokens.isExpired()) {
      const refreshed = await refreshTokens(existingTokens.refreshToken);
      await oauthClient.setTokens(refreshed);
      return refreshed.access_token;
    }
    return existingTokens.accessToken;
  }

  const authRequest = await oauthClient.authorizationRequest({
    endpoint: "https://ticktick.com/oauth/authorize",
    clientId: CLIENT_ID,
    scope: "tasks:write tasks:read",
  });

  const { authorizationCode } = await oauthClient.authorize(authRequest);
  const tokens = await fetchTokens(authorizationCode, authRequest.codeVerifier);
  await oauthClient.setTokens(tokens);
  return tokens.access_token;
}

async function fetchTokens(code: string, codeVerifier: string) {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: "https://raycast.com/redirect?packageName=Extension",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code_verifier: codeVerifier,
  });

  const res = await fetch("https://ticktick.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) throw new Error(`Token fetch failed: ${res.statusText}`);
  return res.json() as Promise<{ access_token: string; refresh_token?: string; expires_in?: number }>;
}

async function refreshTokens(refreshToken: string) {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  const res = await fetch("https://ticktick.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) throw new Error(`Token refresh failed: ${res.statusText}`);
  return res.json() as Promise<{ access_token: string; refresh_token?: string; expires_in?: number }>;
}

export async function getProjects(): Promise<{ id: string; name: string }[]> {
  const token = await getAccessToken();
  const res = await fetch(`${TICKTICK_API}/project`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch projects: ${res.statusText}`);
  return res.json() as Promise<{ id: string; name: string }[]>;
}

export async function createTask(task: {
  title: string;
  dueDate?: string;
  priority?: number;
  tags?: string[];
  projectId?: string;
}): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(`${TICKTICK_API}/task`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(task),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create task: ${res.statusText} — ${body}`);
  }
}
