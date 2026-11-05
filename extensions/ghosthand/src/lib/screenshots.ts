import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

const PREVIEW_PREFIX = "raycast-ghosthand-preview-";

async function removeAbandonedPreviews(root: string) {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const match = /^raycast-ghosthand-preview-(\d+)-/.exec(entry.name);
    if (!entry.isDirectory() || !match) continue;
    try {
      process.kill(Number(match[1]), 0);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ESRCH") {
        await rm(join(root, entry.name), { recursive: true, force: true });
      }
    }
  }
}

/** Detail renders a local image file reliably; its lifetime follows the preview request. */
export async function createPreviewImage(bytes: Buffer, signal: AbortSignal, root = tmpdir()) {
  signal.throwIfAborted();
  await removeAbandonedPreviews(root);
  const directory = await mkdtemp(join(root, `${PREVIEW_PREFIX}${process.pid}-`));
  const file = join(directory, "screen.jpg");
  let cleanup: Promise<void> | undefined;
  const dispose = () => (cleanup ??= rm(directory, { recursive: true, force: true }));
  try {
    await writeFile(file, bytes, { mode: 0o600 });
    signal.throwIfAborted();
    signal.addEventListener(
      "abort",
      () => {
        void dispose().catch(() => undefined);
      },
      { once: true },
    );
    return { bytes, file, dispose };
  } catch (error) {
    await dispose();
    throw error;
  }
}

export async function copyScreenshot(data: Buffer): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "raycast-ghosthand-"));
  const file = join(directory, "screen.jpg");
  try {
    await writeFile(file, data, { mode: 0o600 });
    // Copy actual image bytes, not a file reference that would outlive the temporary file.
    const { runAppleScript } = await import("@raycast/utils");
    await runAppleScript(
      `on run argv
        set the clipboard to (read (POSIX file (item 1 of argv)) as JPEG picture)
      end run`,
      [file],
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function saveScreenshot(data: Buffer): Promise<string> {
  const filename = `Ghosthand-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}.jpg`;
  const file = join(homedir(), "Downloads", filename);
  await writeFile(file, data, { flag: "wx", mode: 0o600 });
  return file;
}
