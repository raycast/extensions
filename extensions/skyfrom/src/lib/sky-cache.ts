import { Cache, environment } from "@raycast/api";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { lock } from "proper-lockfile";

const support = environment.supportPath;
const previewDirectory = join(support, "previews");
const legacyDirectory = join(support, "responses");
const lockDirectory = join(support, "api-cache");
const maxAge = 14 * 86_400_000;
const capacity = 32 * 1024 * 1024;
let nextCleanup = 0;

export type CachedResponse = { data: Buffer; savedAt: number };

function digest(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

async function withCache<T>(namespace: string, task: (cache: Cache) => T): Promise<T> {
  await mkdir(lockDirectory, { recursive: true });
  // Cache loads its LRU index when constructed. Serialize those transactions across commands.
  const release = await lock(lockDirectory, {
    stale: 10_000,
    retries: { retries: 12, minTimeout: 10, maxTimeout: 60, randomize: true },
  });
  try {
    return task(new Cache({ namespace, capacity }));
  } finally {
    await release();
  }
}

export async function withResponseLock<T>(url: URL, task: () => Promise<T>): Promise<T> {
  await mkdir(lockDirectory, { recursive: true });
  const release = await lock(join(lockDirectory, digest(url.href)), {
    realpath: false,
    stale: 30_000,
    retries: { retries: 22, minTimeout: 50, maxTimeout: 700, randomize: true },
  });
  try {
    return await task();
  } finally {
    await release();
  }
}

export async function writeAtomic(path: string, data: string | Buffer) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, data, { flag: "wx" });
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

function isRecent(savedAt: unknown): savedAt is number {
  return typeof savedAt === "number" && Number.isFinite(savedAt) && Date.now() - savedAt <= maxAge;
}

async function readLegacyResponse(url: URL): Promise<CachedResponse | undefined> {
  const extension = url.searchParams.get("format") === "png" ? "png" : "cache";
  const file = join(legacyDirectory, `${digest(url.href)}.${extension}`);
  try {
    const handle = await open(file, "r");
    try {
      const { mtimeMs } = await handle.stat();
      if (isRecent(mtimeMs)) return { data: await handle.readFile(), savedAt: mtimeMs };
    } finally {
      await handle.close();
    }
  } catch {
    return undefined;
  }
}

export async function readResponse(url: URL): Promise<CachedResponse | undefined> {
  const current = await withCache("skyfrom-responses", (cache) => {
    const raw = cache.get(url.href);
    if (!raw) return undefined;
    const entry: unknown = JSON.parse(raw);
    if (
      entry &&
      typeof entry === "object" &&
      "savedAt" in entry &&
      isRecent(entry.savedAt) &&
      "body" in entry &&
      typeof entry.body === "string"
    ) {
      return { savedAt: entry.savedAt, data: Buffer.from(entry.body, "base64") };
    }
    return undefined;
  }).catch(() => undefined);
  if (current) return current;

  const legacy = await readLegacyResponse(url);
  if (legacy) await saveResponse(url, legacy.data, legacy.savedAt);
  return legacy;
}

export async function saveResponse(url: URL, data: Buffer, savedAt = Date.now()) {
  const encoded = JSON.stringify({ body: data.toString("base64"), savedAt });
  await withCache("skyfrom-responses", (cache) => {
    const current = cache.get(url.href);
    if (current) {
      try {
        const existing: unknown = JSON.parse(current);
        if (
          existing &&
          typeof existing === "object" &&
          "savedAt" in existing &&
          typeof existing.savedAt === "number" &&
          existing.savedAt > savedAt
        )
          return;
      } catch {
        // Replace an unreadable cache entry.
      }
    }
    cache.set(url.href, encoded);
  }).catch(() => undefined);
}

function cooldownValue(value: string | undefined) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : 0;
}

export async function getRetryAfter() {
  const cached = await withCache("skyfrom-rate-limit", (cache) => cache.get("retry-after")).catch(() => undefined);
  const legacy =
    cached === undefined ? await readFile(join(support, "retry-after"), "utf8").catch(() => undefined) : undefined;
  return cooldownValue(cached ?? legacy);
}

export async function saveRetryAfter(until: number) {
  try {
    return await withCache("skyfrom-rate-limit", (cache) => {
      const latest = Math.max(until, cooldownValue(cache.get("retry-after")));
      cache.set("retry-after", String(latest));
      return latest;
    });
  } catch {
    return until;
  }
}

export async function previewPath(data: Buffer) {
  const file = join(previewDirectory, `${digest(data)}.png`);
  if (!(await stat(file).catch(() => undefined))?.isFile()) {
    await mkdir(previewDirectory, { recursive: true });
    await writeAtomic(file, data);
  }

  if (Date.now() < nextCleanup) return file;
  nextCleanup = Date.now() + 600_000;
  try {
    const entries = (await readdir(previewDirectory)).filter((name) => /^[a-f0-9]{64}\.png$/.test(name));
    const files = await Promise.allSettled(
      entries.map(async (name) => {
        const path = join(previewDirectory, name);
        return { path, mtime: (await stat(path)).mtimeMs };
      }),
    );
    const ordered = files.flatMap((entry) => (entry.status === "fulfilled" ? [entry.value] : []));
    ordered.sort((a, b) => b.mtime - a.mtime);
    await Promise.allSettled(
      ordered
        .filter((entry, index) => entry.path !== file && (index >= 384 || !isRecent(entry.mtime)))
        .map(({ path }) => rm(path, { force: true })),
    );
  } catch {
    // Preview files can be recreated from the Raycast cache.
  }
  return file;
}
