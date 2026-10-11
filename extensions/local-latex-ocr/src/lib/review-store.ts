import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ReviewRecord } from "../types";

const MAX_REVIEW_AGE_MS = 24 * 60 * 60_000;

type ReviewPointer = { version: 1; requestId: string };

export function reviewDirectory(supportPath: string): string {
  return path.join(supportPath, "review");
}

/**
 * Store each review under its request id and update a small latest pointer.
 * Concurrent captures therefore never overwrite one another's JSON or image.
 */
export async function saveReview(supportPath: string, record: ReviewRecord): Promise<void> {
  const directory = reviewDirectory(supportPath);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeJsonAtomically(path.join(directory, `${record.requestId}.json`), record);
  await writeJsonAtomically(path.join(directory, "latest.json"), {
    version: 1,
    requestId: record.requestId,
  } satisfies ReviewPointer);
}

export async function loadReview(supportPath: string, requestId?: string): Promise<ReviewRecord | undefined> {
  const directory = reviewDirectory(supportPath);
  try {
    const selectedId = requestId ?? (await readLatestRequestId(directory));
    if (selectedId) {
      const record = JSON.parse(await readFile(path.join(directory, `${selectedId}.json`), "utf8")) as ReviewRecord;
      return record.version === 1 && record.requestId === selectedId ? record : undefined;
    }
  } catch {
    // Fall through to the legacy location for users upgrading from v1.
  }

  try {
    const legacy = JSON.parse(await readFile(path.join(directory, "last.json"), "utf8")) as ReviewRecord;
    return legacy.version === 1 ? legacy : undefined;
  } catch {
    return undefined;
  }
}

export async function discardReview(supportPath: string, record?: ReviewRecord): Promise<void> {
  const current = record ?? (await loadReview(supportPath));
  const directory = reviewDirectory(supportPath);
  if (current) await rm(path.join(directory, `${current.requestId}.json`), { force: true });
  await rm(path.join(directory, "last.json"), { force: true });
  if (current?.imagePath) await rm(current.imagePath, { force: true });

  try {
    const pointer = JSON.parse(await readFile(path.join(directory, "latest.json"), "utf8")) as ReviewPointer;
    if (current && pointer.requestId === current.requestId)
      await rm(path.join(directory, "latest.json"), { force: true });
  } catch {
    // No pointer or a concurrently replaced pointer.
  }
}

export async function cleanStaleCaptures(supportPath: string): Promise<void> {
  const cutoff = Date.now() - MAX_REVIEW_AGE_MS;
  await cleanStaleCaptureFiles(path.join(supportPath, "captures"), cutoff);
  await cleanStaleReviewFiles(reviewDirectory(supportPath), cutoff);
}

async function cleanStaleCaptureFiles(directory: string, cutoff: number): Promise<void> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const filePath = path.join(directory, entry.name);
          const metadata = await stat(filePath);
          if (metadata.mtimeMs < cutoff) await rm(filePath, { force: true });
        }),
    );
  } catch {
    // The captures directory does not exist on a clean install.
  }
}

async function cleanStaleReviewFiles(directory: string, cutoff: number): Promise<void> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json") && entry.name !== "latest.json")
        .map(async (entry) => {
          const filePath = path.join(directory, entry.name);
          try {
            const metadata = await stat(filePath);
            if (metadata.mtimeMs >= cutoff) return;
            const record = JSON.parse(await readFile(filePath, "utf8")) as Partial<ReviewRecord>;
            await rm(filePath, { force: true });
            if (record.imagePath) await rm(record.imagePath, { force: true });
          } catch {
            await rm(filePath, { force: true });
          }
        }),
    );
  } catch {
    // The review directory does not exist on a clean install.
  }
}

async function readLatestRequestId(directory: string): Promise<string | undefined> {
  const pointer = JSON.parse(await readFile(path.join(directory, "latest.json"), "utf8")) as ReviewPointer;
  return pointer.version === 1 && pointer.requestId ? pointer.requestId : undefined;
}

async function writeJsonAtomically(filePath: string, value: unknown): Promise<void> {
  const partialPath = `${filePath}.${randomUUID()}.partial`;
  await writeFile(partialPath, JSON.stringify(value, null, 2), { mode: 0o600 });
  await rename(partialPath, filePath);
}
