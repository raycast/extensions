export const SESSION_HELPER_PROTOCOL_VERSION = 1;

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
  credentialsByAdapter: Record<string, Record<string, string>>;
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

import { tmpdir } from "os";
import { join } from "path";

export function sessionHelperSocketPath(scopePid: number): string {
  if (process.platform === "win32") {
    return `\\\\.\\pipe\\vaultcast-${scopePid}`;
  }

  return join(tmpdir(), `vaultcast-helper-${scopePid}.sock`);
}
