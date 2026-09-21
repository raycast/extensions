import { environment } from "@raycast/api";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { lock } from "proper-lockfile";

// Raycast commands run in separate processes but share supportPath and tokens.
// A filesystem lock orders refresh, login commits and logout across commands.
export async function withSessionLock<T>(action: () => Promise<T>): Promise<T> {
  await mkdir(environment.supportPath, { recursive: true });
  const release = await lock(join(environment.supportPath, "oauth-session"), {
    realpath: false,
    retries: { retries: 100, minTimeout: 100, maxTimeout: 300 },
  });
  try {
    return await action();
  } finally {
    await release();
  }
}
