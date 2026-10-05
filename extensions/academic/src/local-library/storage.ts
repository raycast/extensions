import { environment } from "@raycast/api";
import {
  mkdir,
  readFile,
  rename,
  rmdir,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import type { IndexProgress, LocalIndex } from "./types";

const INDEX_FILENAME = "academic-local-index.json";
const LOCK_WAIT_MS = 8_000;
const STALE_LOCK_MS = 30_000;

export function localIndexPath(): string {
  return join(environment.supportPath, INDEX_FILENAME);
}

export async function loadLocalIndex(): Promise<LocalIndex> {
  return readLocalIndex();
}

async function readLocalIndex(): Promise<LocalIndex> {
  try {
    const parsed = JSON.parse(
      await readFile(localIndexPath(), "utf8"),
    ) as LocalIndex;
    if (parsed.version === 1 && Array.isArray(parsed.documents)) return parsed;
  } catch {
    // A missing or interrupted first index is equivalent to an empty index.
  }
  return {
    version: 1,
    updatedAt: new Date(0).toISOString(),
    folders: [],
    documents: [],
  };
}

export async function updateLocalIndex(
  mutate: (index: LocalIndex) => LocalIndex | void | Promise<LocalIndex | void>,
): Promise<LocalIndex> {
  return withIndexLock(async () => {
    const current = await readLocalIndex();
    const next = (await mutate(current)) ?? current;
    await writeLocalIndex(next);
    return next;
  });
}

async function writeLocalIndex(index: LocalIndex): Promise<void> {
  const path = localIndexPath();
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(
    temporary,
    JSON.stringify({ ...index, updatedAt: new Date().toISOString() }),
    { encoding: "utf8", mode: 0o600 },
  );
  await rename(temporary, path);
}

async function withIndexLock<T>(operation: () => Promise<T>): Promise<T> {
  const path = localIndexPath();
  const lockPath = `${path}.lock`;
  await mkdir(dirname(path), { recursive: true });
  const deadline = Date.now() + LOCK_WAIT_MS;
  while (true) {
    try {
      await mkdir(lockPath);
      break;
    } catch (error) {
      if (!hasCode(error, "EEXIST")) throw error;
      try {
        const lockInfo = await stat(lockPath);
        if (Date.now() - lockInfo.mtimeMs > STALE_LOCK_MS) {
          await rmdir(lockPath);
          continue;
        }
      } catch (lockError) {
        if (!hasCode(lockError, "ENOENT")) throw lockError;
        continue;
      }
      if (Date.now() >= deadline)
        throw new Error("The local library index is busy; try again shortly");
      await wait(75);
    }
  }
  try {
    return await operation();
  } finally {
    // Cleanup must never replace the result or error from the protected update.
    // A failed cleanup is recovered by the stale-lock path on the next update.
    await rmdir(lockPath).catch(() => undefined);
  }
}

function hasCode(error: unknown, code: string): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === code,
  );
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function queueLocalDocumentsForReprocessing(
  ids?: string[],
): Promise<number> {
  const selected = ids ? new Set(ids) : undefined;
  let count = 0;
  await updateLocalIndex((index) => {
    for (const document of index.documents) {
      if (selected && !selected.has(document.id)) continue;
      document.stage = "discovered";
      document.analysis = undefined;
      document.embedding = undefined;
      document.error = undefined;
      document.updatedAt = new Date().toISOString();
      count += 1;
    }
  });
  return count;
}

export function indexProgress(index: LocalIndex): IndexProgress {
  const total = index.documents.length;
  const discovered = total;
  const extracted = index.documents.filter(
    (document) => document.evidence,
  ).length;
  const identified = index.documents.filter((document) => document.work).length;
  const verified = index.documents.filter(
    (document) => document.validation?.safe,
  ).length;
  const enriched = index.documents.filter(
    (document) => document.analysis,
  ).length;
  const review = index.documents.filter(
    (document) => document.stage === "review",
  ).length;
  const errors = index.documents.filter(
    (document) => document.stage === "error",
  ).length;
  const analysisEnabled = index.analysisEnabled === true;
  const completedUnits = analysisEnabled ? extracted + enriched : extracted;
  return {
    total,
    discovered,
    extracted,
    identified,
    verified,
    enriched,
    review,
    errors,
    percent: total
      ? Math.round((completedUnits / (total * (analysisEnabled ? 2 : 1))) * 100)
      : 100,
  };
}
