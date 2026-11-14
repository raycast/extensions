import { LocalStorage } from "@raycast/api";

import type { ClinePassCredential } from "./types.ts";

const CLINE_LOCAL_CREDENTIAL_KEY = "clinepass-refreshed-credential-v1";

interface StoredClineCredential {
  version: 1;
  label: string;
  token: string;
  userId: string;
  refreshToken?: string;
  expiresAt?: number;
  clineHome?: string;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseStoredCredential(raw: string): ClinePassCredential | null {
  try {
    const parsed = JSON.parse(raw) as Partial<StoredClineCredential>;
    const label = nonEmptyString(parsed.label);
    const token = nonEmptyString(parsed.token);
    const userId = nonEmptyString(parsed.userId);
    if (parsed.version !== 1 || !label || !token || !userId?.startsWith("usr-")) return null;
    return {
      id: "clinepass-auto",
      label,
      token,
      userId,
      refreshToken: nonEmptyString(parsed.refreshToken) ?? undefined,
      expiresAt:
        typeof parsed.expiresAt === "number" && Number.isFinite(parsed.expiresAt) ? parsed.expiresAt : undefined,
      source: "local",
      clineHome: nonEmptyString(parsed.clineHome) ?? undefined,
    };
  } catch {
    return null;
  }
}

export async function loadClineLocalCredential(): Promise<ClinePassCredential | null> {
  const raw = await LocalStorage.getItem<string>(CLINE_LOCAL_CREDENTIAL_KEY);
  return raw ? parseStoredCredential(raw) : null;
}

export async function saveClineLocalCredential(credential: ClinePassCredential): Promise<void> {
  const stored: StoredClineCredential = {
    version: 1,
    label: credential.label,
    token: credential.token,
    userId: credential.userId,
    refreshToken: credential.refreshToken,
    expiresAt: credential.expiresAt,
    clineHome: credential.clineHome,
  };
  await LocalStorage.setItem(CLINE_LOCAL_CREDENTIAL_KEY, JSON.stringify(stored));
}

export async function clearClineLocalCredential(): Promise<void> {
  await LocalStorage.removeItem(CLINE_LOCAL_CREDENTIAL_KEY);
}
