import { getPreferenceValues } from "@raycast/api";
import { writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

const MAX_NAME_LENGTH = 60;

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
 *
 * Uses an exclusive-create write (`flag: "wx"`) and retries on `EEXIST`, so the
 * collision check and the write are atomic — no TOCTOU window where a file
 * created between the check and the write could be clobbered.
 */
export async function saveMarkdown(
  folder: string,
  name: string,
  content: string,
): Promise<string> {
  const base = sanitizeName(name);
  for (let n = 1; ; n += 1) {
    const candidate = join(folder, n === 1 ? `${base}.md` : `${base} ${n}.md`);
    try {
      await writeFile(candidate, content, { encoding: "utf8", flag: "wx" });
      return candidate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") continue;
      throw error;
    }
  }
}
