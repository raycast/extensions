import { stat, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";

export class MarkdownFileExistsError extends Error {
  readonly path: string;

  constructor(path: string, options?: ErrorOptions) {
    super("A file with this name already exists", options);
    this.name = "MarkdownFileExistsError";
    this.path = path;
  }
}

export async function saveMarkdownFile(
  directory: string,
  requestedFilename: string,
  content: string,
  overwrite: boolean
): Promise<string> {
  const safeFilename = sanitizeMarkdownFilename(requestedFilename);
  const resolvedDirectory = resolve(directory);
  const path = resolve(resolvedDirectory, safeFilename);
  if (dirname(path) !== resolvedDirectory) {
    throw new Error("The selected filename points outside the destination directory");
  }

  try {
    await writeFile(path, content, { encoding: "utf8", flag: overwrite ? "w" : "wx" });
    return path;
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === "EEXIST") {
      throw new MarkdownFileExistsError(path, { cause: error });
    }
    throw error;
  }
}

export async function markdownFileExists(directory: string, requestedFilename: string): Promise<boolean> {
  const path = resolve(resolve(directory), sanitizeMarkdownFilename(requestedFilename));
  try {
    return (await stat(path)).isFile();
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

export function sanitizeMarkdownFilename(requestedFilename: string): string {
  const sanitized = requestedFilename
    .trim()
    .replace(/[\\/:*?"<>|\0]/g, "-")
    .replace(/^\.+$/, "")
    .trim();
  const base = sanitized.length > 0 ? sanitized : "mochi-card";
  return extname(base).toLowerCase() === ".md" ? base : `${base}.md`;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
