import { LocalStorage } from "@raycast/api";

const COPILOT_CLIENT_ID = "Iv1.b507a08c87ecfe98";
const DEVICE_CODE_URL = "https://github.com/login/device/code";
const ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";

const STORAGE_KEY = "copilot_github_access_token";

type DeviceCodeResponse = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
};

type AccessTokenResponse = {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
  interval?: number;
};

export class AuthenticationRequiredError extends Error {
  constructor(message: string = "Authentication required") {
    super(message);
    this.name = "AuthenticationRequiredError";
  }
}

export async function initiateDeviceFlow(): Promise<DeviceCodeResponse> {
  const response = await fetch(DEVICE_CODE_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: COPILOT_CLIENT_ID,
      scope: "read:user",
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to initiate device flow: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<DeviceCodeResponse>;
}

export async function pollForAccessToken(deviceCode: string, interval: number = 5): Promise<string> {
  const pollInterval = Math.max(interval, 5) * 1000;

  while (true) {
    await sleep(pollInterval);

    const response = await fetch(ACCESS_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: COPILOT_CLIENT_ID,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });

    if (!response.ok) {
      throw new Error(`Token request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as AccessTokenResponse;

    if (data.access_token) {
      await LocalStorage.setItem(STORAGE_KEY, data.access_token);
      return data.access_token;
    }

    if (data.error === "authorization_pending") {
      continue;
    }

    if (data.error === "slow_down") {
      await sleep((data.interval ?? interval + 5) * 1000);
      continue;
    }

    if (data.error === "expired_token") {
      throw new Error("Device code expired. Please try again.");
    }

    if (data.error === "access_denied") {
      throw new Error("Authorization was denied.");
    }

    if (data.error) {
      throw new Error(data.error_description ?? data.error);
    }
  }
}

export async function getCachedGitHubToken(): Promise<string | null> {
  const token = await LocalStorage.getItem<string>(STORAGE_KEY);
  return token ?? null;
}

export async function clearCopilotToken(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
