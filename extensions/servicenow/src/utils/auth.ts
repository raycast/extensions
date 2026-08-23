import { LocalStorage } from "@raycast/api";

import { Instance } from "../types";
import { getInstanceBaseUrl } from "./instanceUrl";
import { getClientId } from "./oauth";

const TOKEN_REFRESH_BUFFER_MS = 60_000;

export class OAuthRefreshError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OAuthRefreshError";
  }
}

export function isOAuthExpired(instance: Instance, bufferMs = TOKEN_REFRESH_BUFFER_MS): boolean {
  if (!instance.tokenExpiresAt) return true;
  return instance.tokenExpiresAt - Date.now() <= bufferMs;
}

const refreshInFlight = new Map<string, Promise<Instance>>();

export type OnTokenRefresh = (updated: Instance) => void | Promise<void>;

export type GetAuthHeaderOptions = {
  onRefresh?: OnTokenRefresh;
};

export async function getAuthHeader(instance: Instance, options?: GetAuthHeaderOptions): Promise<string> {
  if (instance.authMode !== "oauth") {
    const username = instance.username ?? "";
    const password = instance.password ?? "";
    return `Basic ${Buffer.from(username + ":" + password).toString("base64")}`;
  }

  if (!instance.accessToken || !instance.refreshToken) {
    throw new OAuthRefreshError("Instance is not authenticated. Please sign in.");
  }

  let current = instance;
  if (isOAuthExpired(instance)) {
    current = await refreshAndPersist(instance, options?.onRefresh);
  }

  return `Bearer ${current.accessToken}`;
}

async function refreshAndPersist(instance: Instance, onRefresh?: OnTokenRefresh): Promise<Instance> {
  const existing = refreshInFlight.get(instance.id);
  if (existing) {
    const result = await existing;
    if (onRefresh) await onRefresh(result);
    return result;
  }

  const promise = (async () => {
    try {
      const tokens = await refreshOAuthToken(instance);
      const updated: Instance = { ...instance, ...tokens, authError: undefined, authErrorAt: undefined };
      await persistInstance(updated);
      return updated;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await persistInstance({ ...instance, authError: message, authErrorAt: Date.now() });
      throw error;
    }
  })().finally(() => {
    refreshInFlight.delete(instance.id);
  });

  refreshInFlight.set(instance.id, promise);
  const result = await promise;
  if (onRefresh) await onRefresh(result);
  return result;
}

export async function refreshOAuthToken(
  instance: Instance,
): Promise<{ accessToken: string; refreshToken: string; tokenExpiresAt: number }> {
  if (!instance.refreshToken) {
    throw new OAuthRefreshError("Missing refresh token.");
  }

  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", instance.refreshToken);
  params.append("client_id", getClientId(instance));

  const response = await fetch(`${getInstanceBaseUrl(instance)}/oauth_token.do`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new OAuthRefreshError(`Token refresh failed (${response.status}): ${text}`);
  }

  const json = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (json.error || !json.access_token) {
    throw new OAuthRefreshError(json.error_description || json.error || "Token refresh failed.");
  }

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? instance.refreshToken,
    tokenExpiresAt: Date.now() + (json.expires_in ?? 1800) * 1000,
  };
}

export async function persistInstance(updated: Instance): Promise<void> {
  const raw = await LocalStorage.getItem<string>("saved-instances");
  if (raw) {
    const list = JSON.parse(raw) as Instance[];
    const next = list.map((i) => (i.id === updated.id ? updated : i));
    await LocalStorage.setItem("saved-instances", JSON.stringify(next));
  }

  const selectedRaw = await LocalStorage.getItem<string>("selected-instance");
  if (selectedRaw) {
    const selected = JSON.parse(selectedRaw) as Instance;
    if (selected.id === updated.id) {
      await LocalStorage.setItem("selected-instance", JSON.stringify(updated));
    }
  }
}
