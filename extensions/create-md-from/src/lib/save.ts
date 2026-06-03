import { getPreferenceValues } from "@raycast/api";
import { existsSync } from "fs";
import { writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

const MAX_NAME_LENGTH = 60;

interface Preferences {
  defaultFolder?: string;
}

/** Resolve the configured default folder, falling back to ~/Desktop. */
export function getDefaultFolder(): string {
  const { defaultFolder } = getPreferenceValues<Preferences>();
  if (defaultFolder && defaultFolder.trim().length > 0) {
    return defaultFolder;
  }
  return join(homedir(), "Desktop");
}

/**
 * Turn arbitrary text into a human-readable file name (no extension).
 * Keeps spaces and casing — this is a name a human reads, not a slug.
 */
export function suggestName(raw: string): string {
  const firstLine =
    raw
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? "";
  return sanitizeName(firstLine);
}

/** Replace illegal filename characters, collapse whitespace, truncate, fallback. */
export function sanitizeName(name: string): string {
  const cleaned = name
    .replace(/[/\\:*?"<>|]/g, "-") // illegal on macOS/most filesystems
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(\s*\.(?:md|markdown))+\s*$/i, "") // strip ANY trailing .md/.markdown — extension is added on save
    .trim()
    .slice(0, MAX_NAME_LENGTH)
    .trim();
  return cleaned.length > 0 ? cleaned : "Untitled";
}

/**
 * Write `content` as a .md file named `name` into `folder`.
 * On name collision, appends " 2", " 3", … (Finder-style). Never overwrites.
 * Returns the absolute path actually written.
 */
export async function saveMarkdown(
  folder: string,
  name: string,
  content: string,
): Promise<string> {
  const base = sanitizeName(name);
  let candidate = join(folder, `${base}.md`);
  let n = 2;
  while (existsSync(candidate)) {
    candidate = join(folder, `${base} ${n}.md`);
    n += 1;
  }
  await writeFile(candidate, content, "utf8");
  return candidate;
}
