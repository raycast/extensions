import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { lock } from "proper-lockfile";
import { CredentialStatus, ProfileStatus, SsoProfile } from "./types";

export function hashKey(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
export function sessionKey(profile: SsoProfile, scope: string): string {
  return hashKey([scope, profile.sessionName || profile.startUrl, profile.startUrl, profile.ssoRegion]);
}
export function profileKey(profile: SsoProfile, scope: string): string {
  return hashKey([
    scope,
    sessionKey(profile, scope),
    profile.accountId,
    profile.roleName,
    profile.region,
    profile.issues,
  ]);
}
export interface StatusMetadata {
  status: CredentialStatus;
  expiration?: string;
  checkedAt?: string;
  lastSuccessAt?: string;
  failures: number;
  nextRetryAt: number;
  failureKind?: ProfileStatus["failureKind"];
}
export interface SessionMetadata {
  failures: number;
  nextRetryAt: number;
  lastLoginAt?: number;
  needsLogin?: boolean;
  recoverySeen?: boolean;
  notified?: boolean;
}
export class OperationBusyError extends Error {
  constructor() {
    super("An operation for this SSO session is already running. Try again shortly.");
  }
}
/** Only allowlisted metadata reaches disk; no child-process output or credential objects. */
export class MetadataStore {
  constructor(readonly directory: string) {}
  private async read(key: string): Promise<Record<string, unknown> | undefined> {
    try {
      const text = await readFile(join(this.directory, `${hashKey(key)}.json`), "utf8");
      if (text.length > 16384) return undefined;
      const data: unknown = JSON.parse(text);
      return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : undefined;
    } catch {
      return undefined;
    }
  }
  private async write(key: string, data: object) {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const target = join(this.directory, `${hashKey(key)}.json`);
    const temporary = `${target}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, JSON.stringify(data), { mode: 0o600 });
      await rename(temporary, target);
    } finally {
      await unlink(temporary).catch(() => undefined);
    }
  }
  async readStatus(key: string): Promise<StatusMetadata | undefined> {
    const data = await this.read(`profile:${key}`);
    if (
      !data ||
      ![
        "Signed In",
        "Expiring Soon",
        "Expired",
        "Not Signed In",
        "Invalid Configuration",
        "AWS CLI Not Found",
        "Checking",
        "Unknown",
      ].includes(String(data.status))
    )
      return undefined;
    const date = (value: unknown) =>
      typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : undefined;
    const failureKind = [
      "missing",
      "timeout",
      "network",
      "login-required",
      "configuration",
      "unsupported",
      "failed",
    ].includes(String(data.failureKind))
      ? (data.failureKind as StatusMetadata["failureKind"])
      : undefined;
    return {
      status: data.status as CredentialStatus,
      expiration: date(data.expiration),
      checkedAt: date(data.checkedAt),
      lastSuccessAt: date(data.lastSuccessAt),
      failures: number(data.failures),
      nextRetryAt: number(data.nextRetryAt),
      failureKind,
    };
  }
  async writeStatus(key: string, value: StatusMetadata) {
    const { status, expiration, checkedAt, lastSuccessAt, failures, nextRetryAt, failureKind } = value;
    await this.write(`profile:${key}`, {
      status,
      expiration,
      checkedAt,
      lastSuccessAt,
      failures,
      nextRetryAt,
      failureKind,
    });
  }
  async readSession(key: string): Promise<SessionMetadata> {
    const data = await this.read(`session:${key}`);
    return {
      failures: number(data?.failures),
      nextRetryAt: number(data?.nextRetryAt),
      lastLoginAt: number(data?.lastLoginAt),
      needsLogin: data?.needsLogin === true,
      recoverySeen: data?.recoverySeen === true,
      notified: data?.notified === true,
    };
  }
  async writeSession(key: string, value: SessionMetadata) {
    const { failures, nextRetryAt, lastLoginAt, needsLogin, recoverySeen, notified } = value;
    await this.write(`session:${key}`, { failures, nextRetryAt, lastLoginAt, needsLogin, recoverySeen, notified });
  }
  async withSessionLock<T>(key: string, operation: () => Promise<T>, waitMs = 1000): Promise<T> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    let compromised = false;
    let release: () => Promise<void>;
    try {
      release = await lock(join(this.directory, `session-${key}`), {
        realpath: false,
        stale: 240000,
        update: 10000,
        retries: { retries: Math.ceil(waitMs / 100), factor: 1, minTimeout: 100, maxTimeout: 100 },
        onCompromised: () => {
          compromised = true;
        },
      });
    } catch {
      throw new OperationBusyError();
    }
    try {
      const result = await operation();
      if (compromised) throw new OperationBusyError();
      return result;
    } finally {
      await release().catch(() => undefined);
    }
  }
}
function number(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}
