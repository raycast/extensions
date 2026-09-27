import { environment } from "@raycast/api";
import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { safeFileName } from "./safeFileName";

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function directory(): string {
  return join(environment.supportPath, "pdf");
}

/**
 * Quick Look can only preview a file on disk, so the PDF is cached locally. Files older than a day
 * are removed on each write — without that, every previewed document would linger forever.
 */
export async function storePdf(ref: string, data: Buffer): Promise<string> {
  const dir = directory();
  await mkdir(dir, { recursive: true });
  await pruneOldFiles(dir);

  const path = join(dir, `${safeFileName(ref)}.pdf`);
  await writeFile(path, data);
  return path;
}

async function pruneOldFiles(dir: string): Promise<void> {
  try {
    const now = Date.now();
    const entries = await readdir(dir);
    await Promise.all(
      entries.map(async (entry) => {
        const path = join(dir, entry);
        const info = await stat(path);
        if (now - info.mtimeMs > MAX_AGE_MS) await unlink(path);
      }),
    );
  } catch {
    // Housekeeping must never break the preview itself.
  }
}
