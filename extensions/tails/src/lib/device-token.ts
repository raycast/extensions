import { createHash, randomUUID } from "node:crypto";
import { hostname, homedir, networkInterfaces } from "node:os";

import { LocalStorage } from "@raycast/api";

import { getPreferences } from "./preferences";

const DEVICE_ID_KEY = "device-id";
const DEVICE_TOKEN_KEY = "device-token";
const DEVICE_TOKEN_EXPIRES_KEY = "device-token-expires";

export interface DeviceTokenState {
  token: string;
  expiresAt: number;
}

function collectFingerprint(): string {
  const parts: string[] = [hostname(), homedir()];

  const nets = networkInterfaces();
  for (const name of Object.keys(nets).sort()) {
    const addrs = nets[name];
    if (!addrs) continue;
    for (const addr of addrs) {
      if (!addr.internal && addr.mac && addr.mac !== "00:00:00:00:00:00") {
        parts.push(addr.mac);
      }
    }
  }

  return createHash("sha256").update(parts.join("|")).digest("base64url");
}

async function getOrCreateDeviceId(): Promise<string> {
  const existing = await LocalStorage.getItem<string>(DEVICE_ID_KEY);
  if (existing) return existing;

  const id = randomUUID();
  await LocalStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

export async function getStoredDeviceToken(): Promise<DeviceTokenState | null> {
  const token = await LocalStorage.getItem<string>(DEVICE_TOKEN_KEY);
  const expiresAt = await LocalStorage.getItem<number>(DEVICE_TOKEN_EXPIRES_KEY);

  if (!token || !expiresAt) return null;
  if (Date.now() / 1000 > expiresAt) return null;

  return { token, expiresAt };
}

async function storeDeviceToken(state: DeviceTokenState): Promise<void> {
  await LocalStorage.setItem(DEVICE_TOKEN_KEY, state.token);
  await LocalStorage.setItem(DEVICE_TOKEN_EXPIRES_KEY, state.expiresAt);
}

export async function clearDeviceToken(): Promise<void> {
  await LocalStorage.removeItem(DEVICE_TOKEN_KEY);
  await LocalStorage.removeItem(DEVICE_TOKEN_EXPIRES_KEY);
}

interface DeviceRegistrationResponse {
  token: string;
  expiresAt: number;
  creditsTotal: number;
  creditsUsed: number;
}

export async function provisionDeviceToken(): Promise<DeviceTokenState> {
  const stored = await getStoredDeviceToken();
  if (stored) return stored;

  const deviceId = await getOrCreateDeviceId();
  const fingerprint = collectFingerprint();
  const { instanceUrl } = getPreferences();

  const res = await fetch(`${instanceUrl}/api/auth/trial`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, fingerprint, channel: "raycast" }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `Trial registration failed (${res.status})`);
  }

  const data = (await res.json()) as DeviceRegistrationResponse;
  const state: DeviceTokenState = {
    token: data.token,
    expiresAt: data.expiresAt,
  };

  await storeDeviceToken(state);
  return state;
}
