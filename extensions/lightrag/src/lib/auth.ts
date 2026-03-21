import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  serverUrl: string;
  username: string;
  password: string;
}

export function getServerUrl(): string {
  const { serverUrl: rawUrl } = getPreferenceValues<Preferences>();
  return rawUrl.replace(/\/$/, "");
}

/**
 * OAuth2 password flow against POST /login; returns JWT for Bearer auth.
 */
export async function getAuthToken(): Promise<string> {
  const { serverUrl: rawUrl, username, password } = getPreferenceValues<Preferences>();
  const serverUrl = rawUrl.replace(/\/$/, "");

  const formData = new URLSearchParams();
  formData.append("username", username);
  formData.append("password", password);
  formData.append("grant_type", "password");
  formData.append("scope", "");

  const response = await fetch(`${serverUrl}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Authentication failed (HTTP ${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { access_token?: string };

  if (!data.access_token) {
    throw new Error("No access_token received from login endpoint.");
  }

  return data.access_token;
}
