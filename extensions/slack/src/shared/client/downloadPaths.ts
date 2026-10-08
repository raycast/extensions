import { open } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const DEFAULT_DOWNLOAD_DIR = path.join(homedir(), "Downloads");

/**
 * Resolves the directory to download into. Defaults to `~/Downloads`, expands a
 * leading `~`, and otherwise resolves the path to an absolute location.
 */
export function expandDownloadDir(dir?: string): string {
  if (!dir || !dir.trim()) {
    return DEFAULT_DOWNLOAD_DIR;
  }

  const trimmed = dir.trim();
  if (trimmed === "~") {
    return homedir();
  }
  if (trimmed.startsWith("~/")) {
    return path.join(homedir(), trimmed.slice(2));
  }

  return path.resolve(trimmed);
}

/**
 * Strips directory components and characters that are unsafe in filenames so a
 * Slack-provided name can't escape the destination directory or break the write.
 */
export function sanitizeFilename(name: string): string {
  const base = path.basename((name ?? "").trim());
  const cleaned = base
    // eslint-disable-next-line no-control-regex
    .replace(/[/\\:*?"<>|\u0000-\u001f]/g, "_")
    .replace(/^\.+/, "")
    .trim();

  return cleaned || "download";
}

function isAlreadyExistsError(error: unknown): boolean {
  return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "EEXIST";
}

/**
 * Reserves a path inside `dir` for `filename` by creating it exclusively
 * (`wx`). Appends ` (2)`, ` (3)`, … before the extension on collision so two
 * downloads cannot claim the same name.
 */
export async function resolveUniquePath(dir: string, filename: string): Promise<string> {
  const ext = path.extname(filename);
  const stem = path.basename(filename, ext);

  let candidate = path.join(dir, filename);
  let counter = 2;

  while (true) {
    try {
      const handle = await open(candidate, "wx");
      await handle.close();
      return candidate;
    } catch (error) {
      if (!isAlreadyExistsError(error)) {
        throw error;
      }
      candidate = path.join(dir, `${stem} (${counter})${ext}`);
      counter += 1;
    }
  }
}
