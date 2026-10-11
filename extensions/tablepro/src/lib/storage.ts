import { createHash } from "crypto";
import { LocalStorage } from "@raycast/api";

export const STORAGE_KEYS = {
  apiToken: "apiToken.v1",
  rejectedToken: "apiToken.rejected",
  pendingVerifier: "pairing.pendingVerifier",
  pendingVerifierCreatedAt: "pairing.pendingVerifier.createdAt",
} as const;

const LEGACY_API_TOKEN_KEY = "apiToken";

export type TokenRejection = "revoked" | "expired";

export async function migrateApiTokenIfNeeded(): Promise<void> {
  const current = await LocalStorage.getItem<string>(STORAGE_KEYS.apiToken);
  if (typeof current === "string" && current.length > 0) {
    await LocalStorage.removeItem(LEGACY_API_TOKEN_KEY);
    return;
  }
  const legacy = await LocalStorage.getItem<string>(LEGACY_API_TOKEN_KEY);
  if (typeof legacy !== "string" || legacy.length === 0) return;
  await LocalStorage.setItem(STORAGE_KEYS.apiToken, legacy);
  await LocalStorage.removeItem(LEGACY_API_TOKEN_KEY);
}

export async function clearApiToken(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEYS.apiToken);
  await LocalStorage.removeItem(STORAGE_KEYS.rejectedToken);
  await LocalStorage.removeItem(LEGACY_API_TOKEN_KEY);
}

export async function readStoredApiToken(): Promise<string | undefined> {
  await migrateApiTokenIfNeeded();
  const value = await LocalStorage.getItem<string>(STORAGE_KEYS.apiToken);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export async function rememberRejectedToken(
  token: string,
  reason: TokenRejection,
): Promise<void> {
  await LocalStorage.setItem(
    STORAGE_KEYS.rejectedToken,
    `${reason}:${fingerprint(token)}`,
  );
}

export async function rejectionOf(
  token: string,
): Promise<TokenRejection | undefined> {
  const value = await LocalStorage.getItem<string>(STORAGE_KEYS.rejectedToken);
  if (typeof value !== "string") return undefined;
  const [reason, hash] = value.split(":");
  if (hash !== fingerprint(token)) return undefined;
  return reason === "expired" ? "expired" : "revoked";
}

function fingerprint(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
