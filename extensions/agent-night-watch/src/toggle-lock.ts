export const LOCK_STALE_AFTER_MS = 5_000;

interface LockOwner {
  version: 1;
  pid: number;
  token: string;
  acquiredAt: string;
}

export function serializeLockOwner(owner: LockOwner): string {
  return `${JSON.stringify(owner)}\n`;
}

export function parseLockOwnerToken(contents: string): string | undefined {
  try {
    const parsed = JSON.parse(contents) as Partial<LockOwner>;
    return parsed.version === 1 && typeof parsed.token === "string"
      ? parsed.token
      : undefined;
  } catch {
    return undefined;
  }
}

export function lockLeaseExpired(
  modifiedAtMs: number,
  nowMs = Date.now(),
): boolean {
  return nowMs - modifiedAtMs >= LOCK_STALE_AFTER_MS;
}
