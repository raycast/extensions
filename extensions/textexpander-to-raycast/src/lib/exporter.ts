import { open, unlink, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { RaycastSnippet } from "./types";

export function validateFilename(filename: string): string | undefined {
  if (!filename.trim()) return "Enter a filename.";
  if (basename(filename) !== filename || /[\\/:\0]/.test(filename) || !filename.endsWith(".json")) {
    return "Use a filename ending in .json, without a folder path.";
  }
}

export async function exportSnippets(options: {
  directory: string;
  filename: string;
  snippets: RaycastSnippet[];
}): Promise<string> {
  const error = validateFilename(options.filename);
  if (error) throw new Error(error);
  if (options.snippets.length === 0) throw new Error("Select at least one snippet to export.");
  const filePath = join(options.directory, options.filename);
  // Match Raycast's import schema and keep review metadata out of the file.
  const snippets = options.snippets.map(({ name, text, keyword }) => ({
    name,
    text,
    ...(keyword ? { keyword } : {}),
  }));
  const data = `${JSON.stringify(snippets, null, 2)}\n`;
  const file = await open(filePath, "wx", 0o600);
  try {
    await writeFile(file, data);
  } catch (error) {
    await unlink(filePath);
    throw error;
  } finally {
    await file.close();
  }
  return filePath;
}
