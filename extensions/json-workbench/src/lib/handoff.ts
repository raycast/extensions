import { readdir, stat, unlink } from "node:fs/promises";
import { join } from "node:path";

export async function clearStaleHandoffs(directory: string, maxAgeMs = 60_000): Promise<void> {
  const now = Date.now();
  for (const name of await readdir(directory)) {
    if (!/^input-[0-9a-f-]{36}\.json$/.test(name)) continue;
    const file = join(directory, name);
    const info = await stat(file).catch(() => undefined);
    if (info?.isFile() && now - info.mtimeMs > maxAgeMs) await unlink(file).catch(() => undefined);
  }
}

// The Swift entry point returns only after the window consumes its input.
// Keep cleanup around the whole write/import/launch operation, including failures.
export async function runWithHandoff(launch: () => Promise<void>, request: string): Promise<void> {
  try {
    await launch();
  } finally {
    await unlink(request).catch(() => undefined);
  }
}
