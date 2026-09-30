import { randomUUID } from "crypto";
import { access, mkdir, readFile, rename, rm, stat, writeFile } from "fs/promises";
import path from "path";

export const DEFAULT_COLLECTION_LEASE_STALE_MS = 20_000;

type LeaseOwner = {
  ownerId: string;
  acquiredAt: number;
};

export type CollectionLease =
  | {
      status: "acquired";
      ownerId: string;
      release: () => Promise<void>;
    }
  | {
      status: "active";
      ageMs: number;
    };

export interface CollectionLeaseOptions {
  lockDirectory: string;
  staleAfterMs?: number;
  ownerId?: string;
  now?: () => number;
}

function ownerFile(lockDirectory: string): string {
  return path.join(lockDirectory, "owner.json");
}

function recoveryDirectory(lockDirectory: string): string {
  return `${lockDirectory}.recovery.lock`;
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function readOwner(lockDirectory: string): Promise<LeaseOwner | undefined> {
  try {
    const parsed: unknown = JSON.parse(await readFile(ownerFile(lockDirectory), "utf8"));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "ownerId" in parsed &&
      typeof parsed.ownerId === "string" &&
      "acquiredAt" in parsed &&
      typeof parsed.acquiredAt === "number" &&
      Number.isFinite(parsed.acquiredAt)
    ) {
      return parsed as LeaseOwner;
    }
  } catch {
    // A process may have stopped after mkdir and before writing its owner file.
  }
  return undefined;
}

async function leaseAgeMs(lockDirectory: string, now: number): Promise<number> {
  const owner = await readOwner(lockDirectory);
  if (owner && owner.acquiredAt <= now + 5 * 60 * 1_000) {
    return Math.max(0, now - owner.acquiredAt);
  }

  try {
    const info = await stat(lockDirectory);
    return Math.max(0, now - info.mtimeMs);
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

async function releaseOwnedLease(lockDirectory: string, ownerId: string): Promise<void> {
  const owner = await readOwner(lockDirectory);
  if (owner?.ownerId === ownerId) {
    await rm(lockDirectory, { recursive: true, force: true });
  }
}

async function acquireRecoveryGuard(
  lockDirectory: string,
  staleAfterMs: number,
  ownerId: string,
  now: () => number,
): Promise<CollectionLease | undefined> {
  const guardDirectory = recoveryDirectory(lockDirectory);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let created = false;
    try {
      await mkdir(guardDirectory);
      created = true;
      const acquiredAt = now();
      await writeFile(ownerFile(guardDirectory), JSON.stringify({ ownerId, acquiredAt } satisfies LeaseOwner), {
        encoding: "utf8",
        flag: "wx",
      });
      return {
        status: "acquired",
        ownerId,
        release: () => releaseOwnedLease(guardDirectory, ownerId),
      };
    } catch (error) {
      const code = error instanceof Error && "code" in error ? error.code : undefined;
      if (created) {
        await rm(guardDirectory, { recursive: true, force: true }).catch(() => undefined);
        return undefined;
      }
      if (code !== "EEXIST") return undefined;
      if ((await leaseAgeMs(guardDirectory, now())) <= staleAfterMs) return undefined;

      try {
        await rm(guardDirectory, { recursive: true, force: true });
      } catch {
        return undefined;
      }
    }
  }

  return undefined;
}

/** Acquire an atomic directory lease shared by separate Raycast workers. */
export async function acquireCollectionLease({
  lockDirectory,
  staleAfterMs = DEFAULT_COLLECTION_LEASE_STALE_MS,
  ownerId = randomUUID(),
  now = Date.now,
}: CollectionLeaseOptions): Promise<CollectionLease> {
  if (!path.basename(lockDirectory).endsWith(".lock")) {
    throw new Error("Collection lease path must end in .lock");
  }
  if (!Number.isFinite(staleAfterMs) || staleAfterMs <= 0) {
    throw new Error("Collection lease stale timeout must be positive");
  }

  await mkdir(path.dirname(lockDirectory), { recursive: true });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const recoveryPath = recoveryDirectory(lockDirectory);
    if (await pathExists(recoveryPath)) {
      const recoveryAgeMs = await leaseAgeMs(recoveryPath, now());
      if (recoveryAgeMs <= staleAfterMs) return { status: "active", ageMs: 0 };
      try {
        await rm(recoveryPath, { recursive: true, force: true });
      } catch {
        return { status: "active", ageMs: 0 };
      }
    }

    try {
      await mkdir(lockDirectory);
      if (await pathExists(recoveryDirectory(lockDirectory))) {
        await rm(lockDirectory, { recursive: true, force: true });
        return { status: "active", ageMs: 0 };
      }

      const acquiredAt = now();
      try {
        await writeFile(ownerFile(lockDirectory), JSON.stringify({ ownerId, acquiredAt } satisfies LeaseOwner), {
          encoding: "utf8",
          flag: "wx",
        });
      } catch (error) {
        await rm(lockDirectory, { recursive: true, force: true });
        throw error;
      }

      return {
        status: "acquired",
        ownerId,
        release: () => releaseOwnedLease(lockDirectory, ownerId),
      };
    } catch (error) {
      const code = error instanceof Error && "code" in error ? error.code : undefined;
      if (code !== "EEXIST") throw error;

      const ageMs = await leaseAgeMs(lockDirectory, now());
      if (ageMs <= staleAfterMs) return { status: "active", ageMs };

      const recovery = await acquireRecoveryGuard(lockDirectory, staleAfterMs, `${ownerId}-recovery`, now);
      if (!recovery || recovery.status !== "acquired") return { status: "active", ageMs };

      try {
        const confirmedAgeMs = await leaseAgeMs(lockDirectory, now());
        if (confirmedAgeMs <= staleAfterMs) return { status: "active", ageMs: confirmedAgeMs };

        const quarantine = `${lockDirectory}.stale-${randomUUID()}`;
        try {
          await rename(lockDirectory, quarantine);
        } catch (renameError) {
          const renameCode = renameError instanceof Error && "code" in renameError ? renameError.code : undefined;
          if (renameCode !== "ENOENT") throw renameError;
          continue;
        }
        await rm(quarantine, { recursive: true, force: true });
      } finally {
        await recovery.release();
      }
    }
  }

  return { status: "active", ageMs: 0 };
}

export async function withCollectionLease<T>(
  options: CollectionLeaseOptions,
  collect: () => Promise<T>,
): Promise<{ status: "collected"; value: T } | { status: "active"; ageMs: number }> {
  const lease = await acquireCollectionLease(options);
  if (lease.status === "active") return lease;

  try {
    return { status: "collected", value: await collect() };
  } finally {
    await lease.release();
  }
}
