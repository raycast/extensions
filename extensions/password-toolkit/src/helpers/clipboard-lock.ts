import { environment } from "@raycast/api";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import lockfile from "proper-lockfile";

export async function withClipboardLock<T>(operation: () => Promise<T>): Promise<T> {
  await mkdir(environment.supportPath, { recursive: true });
  const release = await lockfile.lock(environment.supportPath, {
    lockfilePath: join(environment.supportPath, "clipboard.lock"),
    retries: { retries: 20, minTimeout: 100, maxTimeout: 1_000 },
  });

  try {
    return await operation();
  } finally {
    await release();
  }
}
