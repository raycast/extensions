import { LocalStorage, getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import * as http from "http";

const BASE_URL = "https://ticktick.com";
const REDIRECT_URI = "http://localhost:42813/callback";

interface Preferences {
  clientId: string;
  clientSecret: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

function buildAuthUrl(clientId: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "tasks:read tasks:write",
  });
  return `${BASE_URL}/oauth/authorize?${params.toString()}`;
}

async function exchangeCodeForToken(code: string, clientId: string, clientSecret: string): Promise<TokenResponse> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${BASE_URL}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
    }).toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed: ${text}`);
  }

  return response.json() as Promise<TokenResponse>;
}

function waitForCallback(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost:42813`);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <html><body style="font-family:system-ui;text-align:center;padding:60px">
          <h2>${code ? "✅ Authenticated!" : "❌ Authentication failed"}</h2>
          <p>${code ? "You can close this tab and return to Raycast." : (error ?? "Unknown error")}</p>
        </body></html>
      `);

      server.close();

      if (code) resolve(code);
      else reject(new Error(error ?? "No code received"));
    });

    server.listen(42813, "localhost", () => {
      // server is ready
    });

    server.on("error", reject);

    // Timeout after 5 minutes
    setTimeout(
      () => {
        server.close();
        reject(new Error("Authentication timed out"));
      },
      5 * 60 * 1000,
    );
  });
}

export async function authenticate(): Promise<string> {
  const prefs = getPreferenceValues<Preferences>();

  await showToast({
    style: Toast.Style.Animated,
    title: "Opening TickTick login...",
    message: "Sign in with Google in your browser",
  });

  const authUrl = buildAuthUrl(prefs.clientId);
  await open(authUrl);

  const code = await waitForCallback();
  const tokens = await exchangeCodeForToken(code, prefs.clientId, prefs.clientSecret);

  await LocalStorage.setItem("ticktick_access_token", tokens.access_token);
  if (tokens.refresh_token) {
    await LocalStorage.setItem("ticktick_refresh_token", tokens.refresh_token);
  }

  await showToast({ style: Toast.Style.Success, title: "Connected to TickTick!" });
  return tokens.access_token;
}

export async function refreshAccessToken(): Promise<string> {
  const prefs = getPreferenceValues<Preferences>();
  const refreshToken = await LocalStorage.getItem<string>("ticktick_refresh_token");

  if (!refreshToken) return await authenticate();

  const credentials = Buffer.from(`${prefs.clientId}:${prefs.clientSecret}`).toString("base64");
  const response = await fetch(`${BASE_URL}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    await LocalStorage.removeItem("ticktick_access_token");
    await LocalStorage.removeItem("ticktick_refresh_token");
    return await authenticate();
  }

  const tokens = (await response.json()) as TokenResponse;
  await LocalStorage.setItem("ticktick_access_token", tokens.access_token);
  if (tokens.refresh_token) {
    await LocalStorage.setItem("ticktick_refresh_token", tokens.refresh_token);
  }

  return tokens.access_token;
}

export async function getStoredToken(): Promise<string | null> {
  return (await LocalStorage.getItem<string>("ticktick_access_token")) ?? null;
}

export async function logout(): Promise<void> {
  await LocalStorage.removeItem("ticktick_access_token");
  await LocalStorage.removeItem("ticktick_refresh_token");
}
