import { randomBytes, createHash } from "crypto";
import { LocalStorage } from "@raycast/api";
import { STORAGE_KEYS } from "./storage";

export interface PKCEPair {
  verifier: string;
  challenge: string;
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function generatePKCE(): PKCEPair {
  const verifier = base64UrlEncode(randomBytes(32));
  const challenge = base64UrlEncode(
    createHash("sha256").update(verifier).digest(),
  );
  return { verifier, challenge };
}

export const PAIR_CALLBACK_URL =
  "raycast://extensions/ngoquocdat/tablepro/pair";

export const VERIFIER_TTL_MS = 5 * 60 * 1000;

const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isValidPairingCode(code: unknown): code is string {
  return typeof code === "string" && UUID_PATTERN.test(code.trim());
}

export interface PendingVerifier {
  verifier: string;
  createdAt: number;
}

export async function savePendingVerifier(verifier: string): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.pendingVerifier, verifier);
  await LocalStorage.setItem(
    STORAGE_KEYS.pendingVerifierCreatedAt,
    Date.now().toString(),
  );
}

export async function loadPendingVerifier(): Promise<PendingVerifier | null> {
  const verifier = await LocalStorage.getItem<string>(
    STORAGE_KEYS.pendingVerifier,
  );
  if (typeof verifier !== "string" || verifier.length === 0) return null;
  const rawCreatedAt = await LocalStorage.getItem<string>(
    STORAGE_KEYS.pendingVerifierCreatedAt,
  );
  const createdAt =
    typeof rawCreatedAt === "string" ? Number.parseInt(rawCreatedAt, 10) : NaN;
  if (!Number.isFinite(createdAt)) return null;
  return { verifier, createdAt };
}

export async function clearPendingVerifier(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEYS.pendingVerifier);
  await LocalStorage.removeItem(STORAGE_KEYS.pendingVerifierCreatedAt);
}

export function isVerifierExpired(
  pending: PendingVerifier,
  now: number = Date.now(),
): boolean {
  return now - pending.createdAt > VERIFIER_TTL_MS;
}
