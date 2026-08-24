import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";
import {
  appendSubscriptionSnapshot,
  buildSubscriptionUsageResult,
  buildSubscriptionUsageForecast,
  fetchClaudeSubscriptionUsage,
  makeSubscriptionUsageSnapshot,
  SUBSCRIPTION_CACHE_TTL_MS,
  SubscriptionUsageError,
  validateCachedSubscriptionUsage,
  validateSubscriptionSnapshot,
  type ClaudeSubscriptionUsage,
  type FetchLike,
  type SubscriptionUsageResult,
  type SubscriptionUsageSnapshot,
} from "./subscription-usage";

const CACHE_VERSION = 1;
const CACHE_FILE = "usage-cache.json";
const HISTORY_FILE = "usage-history.json";
const LOCK_FILE = "refresh.lock";
const LOCK_STALE_MS = 30_000;
const LOCK_TIMEOUT_MS = 15_000;
const LOCK_POLL_MS = 100;

export interface LoadSubscriptionUsageOptions {
  credential?: string;
  forceRefresh?: boolean;
  signal?: AbortSignal;
  fetchImpl?: FetchLike;
  now?: Date;
  timeoutMs?: number;
}

export async function loadStoredSubscriptionUsage(
  storageDirectory: string,
  options: LoadSubscriptionUsageOptions = {},
): Promise<SubscriptionUsageResult> {
  await ensurePrivateDirectory(storageDirectory);
  const now = options.now ?? new Date();
  let cached = await readUsageCache(storageDirectory);
  let snapshots = await readUsageHistory(storageDirectory);

  if (
    cached &&
    !options.forceRefresh &&
    now.getTime() - Date.parse(cached.fetchedAt) < SUBSCRIPTION_CACHE_TTL_MS
  ) {
    return resultFromUsage(cached, snapshots, false, undefined, now);
  }

  const credential = options.credential?.trim();
  if (!credential) {
    return cached
      ? resultFromUsage(
          cached,
          snapshots,
          true,
          "Add A Subscription Usage OAuth Token In Extension Preferences",
          now,
        )
      : {
          forecast: buildSubscriptionUsageForecast(
            [],
            emptyUsage(now),
            now.getTime(),
          ),
          stale: false,
          error:
            "Add A Subscription Usage OAuth Token In Extension Preferences",
        };
  }

  return withRefreshLock(storageDirectory, options.signal, async () => {
    cached = await readUsageCache(storageDirectory);
    snapshots = await readUsageHistory(storageDirectory);
    if (
      cached &&
      !options.forceRefresh &&
      now.getTime() - Date.parse(cached.fetchedAt) < SUBSCRIPTION_CACHE_TTL_MS
    ) {
      return resultFromUsage(cached, snapshots, false, undefined, now);
    }

    try {
      const usage = await fetchClaudeSubscriptionUsage(credential, {
        signal: options.signal,
        fetchImpl: options.fetchImpl,
        now,
        timeoutMs: options.timeoutMs,
      });
      await writeUsageCache(storageDirectory, usage);
      const snapshot = makeSubscriptionUsageSnapshot(usage);
      if (snapshot) {
        snapshots = appendSubscriptionSnapshot(
          snapshots,
          snapshot,
          now.getTime(),
        );
        await writeUsageHistory(storageDirectory, snapshots);
      }
      return resultFromUsage(usage, snapshots, false, undefined, now);
    } catch (error) {
      if (options.signal?.aborted) throw error;
      const message = safeUsageError(error);
      return cached
        ? resultFromUsage(cached, snapshots, true, message, now)
        : {
            forecast: buildSubscriptionUsageForecast(
              snapshots,
              emptyUsage(now),
              now.getTime(),
            ),
            stale: false,
            error: message,
          };
    }
  });
}

export async function readStoredSubscriptionHistory(
  storageDirectory: string,
): Promise<SubscriptionUsageSnapshot[]> {
  return readUsageHistory(storageDirectory);
}

function resultFromUsage(
  usage: ClaudeSubscriptionUsage,
  snapshots: SubscriptionUsageSnapshot[],
  stale: boolean,
  error: string | undefined,
  now: Date,
): SubscriptionUsageResult {
  return buildSubscriptionUsageResult(usage, snapshots, {
    stale,
    error,
    now,
  });
}

function emptyUsage(now: Date): ClaudeSubscriptionUsage {
  return { fetchedAt: now.toISOString(), warnings: [], scopedWeekly: [] };
}

async function readUsageCache(
  storageDirectory: string,
): Promise<ClaudeSubscriptionUsage | undefined> {
  try {
    const value: unknown = JSON.parse(
      await fs.promises.readFile(
        path.join(storageDirectory, CACHE_FILE),
        "utf8",
      ),
    );
    if (!isObject(value) || value.version !== CACHE_VERSION) return undefined;
    return validateCachedSubscriptionUsage(value.usage) ?? undefined;
  } catch {
    return undefined;
  }
}

async function readUsageHistory(
  storageDirectory: string,
): Promise<SubscriptionUsageSnapshot[]> {
  try {
    const value: unknown = JSON.parse(
      await fs.promises.readFile(
        path.join(storageDirectory, HISTORY_FILE),
        "utf8",
      ),
    );
    if (
      !isObject(value) ||
      value.version !== CACHE_VERSION ||
      !Array.isArray(value.snapshots)
    ) {
      return [];
    }
    return value.snapshots
      .map(validateSubscriptionSnapshot)
      .filter(
        (snapshot): snapshot is SubscriptionUsageSnapshot => snapshot !== null,
      );
  } catch {
    return [];
  }
}

async function writeUsageCache(
  storageDirectory: string,
  usage: ClaudeSubscriptionUsage,
): Promise<void> {
  await atomicWriteJson(path.join(storageDirectory, CACHE_FILE), {
    version: CACHE_VERSION,
    usage,
  });
}

async function writeUsageHistory(
  storageDirectory: string,
  snapshots: SubscriptionUsageSnapshot[],
): Promise<void> {
  await atomicWriteJson(path.join(storageDirectory, HISTORY_FILE), {
    version: CACHE_VERSION,
    snapshots,
  });
}

async function withRefreshLock<T>(
  storageDirectory: string,
  signal: AbortSignal | undefined,
  action: () => Promise<T>,
): Promise<T> {
  const lockPath = path.join(storageDirectory, LOCK_FILE);
  const startedAt = Date.now();
  let lock: fs.promises.FileHandle | undefined;
  while (!lock) {
    assertNotAborted(signal);
    try {
      lock = await fs.promises.open(lockPath, "wx", 0o600);
      await lock.writeFile(String(process.pid));
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException)?.code !== "EEXIST") throw error;
      try {
        const stat = await fs.promises.stat(lockPath);
        if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
          await fs.promises.rm(lockPath, { force: true });
          continue;
        }
      } catch {
        continue;
      }
      if (Date.now() - startedAt > LOCK_TIMEOUT_MS) {
        throw new Error("Timed Out Waiting For Subscription Usage Refresh");
      }
      await wait(LOCK_POLL_MS, signal);
    }
  }
  try {
    return await action();
  } finally {
    await lock.close();
    await fs.promises.rm(lockPath, { force: true });
  }
}

async function atomicWriteJson(
  filePath: string,
  value: unknown,
): Promise<void> {
  await fs.promises.mkdir(path.dirname(filePath), {
    recursive: true,
    mode: 0o700,
  });
  const temporaryPath = `${filePath}.${process.pid}.${randomBytes(6).toString(
    "hex",
  )}.tmp`;
  const handle = await fs.promises.open(temporaryPath, "wx", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(value)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await fs.promises.rename(temporaryPath, filePath);
    await fs.promises.chmod(filePath, 0o600).catch(() => undefined);
  } catch (error) {
    await fs.promises.rm(temporaryPath, { force: true });
    throw error;
  }
}

async function ensurePrivateDirectory(directoryPath: string): Promise<void> {
  await fs.promises.mkdir(directoryPath, { recursive: true, mode: 0o700 });
  await fs.promises.chmod(directoryPath, 0o700).catch(() => undefined);
}

function wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(
        new SubscriptionUsageError(
          "Claude Subscription Usage Refresh Was Cancelled",
          "Cancelled",
        ),
      );
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) onAbort();
  });
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new SubscriptionUsageError(
      "Claude Subscription Usage Refresh Was Cancelled",
      "Cancelled",
    );
  }
}

function safeUsageError(error: unknown): string {
  if (error instanceof SubscriptionUsageError) return error.message;
  return "Claude Subscription Usage Refresh Failed";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
