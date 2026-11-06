import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { tmpdir } from "os";
import { join } from "path";

// Keep the wire format in sync with assets/session-helper.mjs, which runs as plain Node and cannot import this file.
export const SESSION_HELPER_PROTOCOL_VERSION = 2;
export const SESSION_HELPER_KEY_BYTES = 32;

const CIPHER = "aes-256-gcm";
const IV_BYTES = 12;

export type SessionHelperMessageDirection = "request" | "response";

export const SESSION_HELPER_METHODS = [
  "ping",
  "getSnapshot",
  "remember",
  "peek",
  "hasRemembered",
  "lock",
  "unlockAfterPresence",
  "clear",
  "markActivity",
  "lockIfExpired",
] as const;

export type SessionHelperMethod = (typeof SESSION_HELPER_METHODS)[number];

export interface SessionHelperRequest {
  protocolVersion: number;
  id: string;
  issuedAt: number;
  method: SessionHelperMethod;
  params?: Record<string, unknown>;
}

export interface SessionHelperSuccessResponse {
  ok: true;
  id: string;
  result: unknown;
}

export interface SessionHelperErrorResponse {
  ok: false;
  id: string;
  error: { message: string };
}

export type SessionHelperResponse = SessionHelperSuccessResponse | SessionHelperErrorResponse;

export interface SessionHelperSnapshot {
  /** Only populated while the session is active; locked credentials are released by `unlockAfterPresence`. */
  credentialsByAdapter: Record<string, Record<string, string>>;
  rememberedAdapterIds: string[];
  locked: boolean;
  lastActivityAt: number;
}

export interface SessionHelperPeekResult {
  credentials?: Record<string, string>;
}

export interface SessionHelperHasRememberedResult {
  value: boolean;
}

export interface SessionHelperLockIfExpiredResult {
  locked: boolean;
  changed: boolean;
}

export const DEFAULT_SESSION_TIMEOUT_MINUTES = 15;
export const MIN_SESSION_TIMEOUT_MINUTES = 1;
export const MAX_SESSION_TIMEOUT_MINUTES = 1440;

export function parseSessionTimeoutMinutes(raw: string | number | undefined): number {
  const parsed = typeof raw === "number" ? raw : Number.parseInt(raw ?? String(DEFAULT_SESSION_TIMEOUT_MINUTES), 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_SESSION_TIMEOUT_MINUTES;
  }

  return Math.min(MAX_SESSION_TIMEOUT_MINUTES, Math.max(MIN_SESSION_TIMEOUT_MINUTES, parsed));
}

export function sessionHelperSocketPath(instanceId: string): string {
  if (process.platform === "win32") {
    return `\\\\.\\pipe\\vaultcast-${instanceId}`;
  }

  return join(tmpdir(), `vaultcast-helper-${instanceId}.sock`);
}

/** Encrypts and authenticates one protocol message with the helper's per-instance key. */
export function sealSessionHelperMessage(
  key: Buffer,
  direction: SessionHelperMessageDirection,
  payload: unknown,
): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(CIPHER, key, iv);
  cipher.setAAD(Buffer.from(direction));
  const data = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return JSON.stringify({
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64"),
  });
}

/** Throws unless the line was sealed with `key` for `direction`. */
export function openSessionHelperMessage(key: Buffer, direction: SessionHelperMessageDirection, line: string): unknown {
  const envelope = JSON.parse(line) as { iv?: unknown; tag?: unknown; data?: unknown };
  if (typeof envelope.iv !== "string" || typeof envelope.tag !== "string" || typeof envelope.data !== "string") {
    throw new Error("Malformed session helper message");
  }

  const decipher = createDecipheriv(CIPHER, key, Buffer.from(envelope.iv, "base64"));
  decipher.setAAD(Buffer.from(direction));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  const plain = Buffer.concat([decipher.update(Buffer.from(envelope.data, "base64")), decipher.final()]);
  return JSON.parse(plain.toString("utf8"));
}
