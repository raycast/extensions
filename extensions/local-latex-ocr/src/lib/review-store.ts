import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ReviewRecord } from "../types";

const MAX_REVIEW_AGE_MS = 24 * 60 * 60_000;

export function reviewDirectory(supportPath: string): string {
  return path.join(supportPath, "review");
}

export async function saveReview(supportPath: string, record: ReviewRecord): Promise<void> {
  const directory = reviewDirectory(supportPath);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(path.join(directory, "last.json"), JSON.stringify(record, null, 2), {
    mode: 0o600,
  });
}

export async function loadReview(supportPath: string): Promise<ReviewRecord | undefined> {
  try {
    const record = JSON.parse(
      await readFile(path.join(reviewDirectory(supportPath), "last.json"), "utf8"),
    ) as ReviewRecord;
    return record.version === 1 ? record : undefined;
  } catch {
    return undefined;
  }
}

export async function discardReview(supportPath: string, record?: ReviewRecord): Promise<void> {
  const current = record ?? (await loadReview(supportPath));
  await rm(path.join(reviewDirectory(supportPath), "last.json"), { force: true });
  if (current?.imagePath) await rm(current.imagePath, { force: true });
}

export async function cleanStaleCaptures(supportPath: string): Promise<void> {
  const directory = path.join(supportPath, "captures");
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const cutoff = Date.now() - MAX_REVIEW_AGE_MS;
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
