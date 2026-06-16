import { createClerkClient, type ClerkClient } from "@clerk/backend";
import type { ClerkApp, InstanceType } from "../types";

export const DASHBOARD_API_KEYS_URL = "https://dashboard.clerk.com/last-active?path=api-keys";

const SECRET_KEY_RE = /^sk_(test|live)_[A-Za-z0-9]+$/;

export function isClerkSecretKey(text: string): boolean {
  return SECRET_KEY_RE.test(text.trim());
}

export function instanceTypeFromKey(key: string): InstanceType {
  return key.trim().startsWith("sk_live_") ? "production" : "development";
}

export function defaultAppName(key: string): string {
  const trimmed = key.trim();
  const type = instanceTypeFromKey(trimmed);
  const label = type === "production" ? "Production" : "Development";
  return `${label} · ${trimmed.slice(-4)}`;
}

const clientCache = new Map<string, ClerkClient>();

export function clientFor(app: ClerkApp): ClerkClient {
  const cached = clientCache.get(app.secretKey);
  if (cached) return cached;
  const client = createClerkClient({ secretKey: app.secretKey });
  clientCache.set(app.secretKey, client);
  return client;
}
