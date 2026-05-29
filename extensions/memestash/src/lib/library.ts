/**
 * "Read/search the library" half of the extension — deliberately kept separate
 * from the platform-specific insert step (see insert.ts). Resolves the
 * configurable library folder, ensures it exists, and lists memes in memory.
 *
 * Search itself is not done here: the Grid's built-in fuzzy `filtering` matches
 * across each item's title + keywords, which is plenty for tens to low hundreds
 * of images. We just hand it the in-memory list.
 */
import { getPreferenceValues } from "@raycast/api";
import { homedir } from "os";
import { basename, extname, join } from "path";
import { existsSync, mkdirSync } from "fs";
import { Meme, MANIFEST_FILENAME, IMAGE_EXTENSIONS } from "./types";
import { loadManifest } from "./manifest";

/** Resolve the library folder from preferences, expanding a leading `~`. */
export function getLibraryDir(): string {
  const { libraryPath } = getPreferenceValues<{ libraryPath?: string }>();
  const raw = libraryPath?.trim() || join(homedir(), "Pictures", "MemeStash");
  return raw.startsWith("~") ? join(homedir(), raw.slice(1)) : raw;
}

/** Resolve the library folder, creating it (recursively) if missing. */
export function ensureLibraryDir(): string {
  const dir = getLibraryDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function getManifestPath(): string {
  return join(getLibraryDir(), MANIFEST_FILENAME);
}

export function isImagePath(path: string): boolean {
  const lower = path.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Derive a human display name from a filename: drop the extension, split on any
 * run of non-alphanumeric characters, and capitalize each word's first letter.
 * Existing inner capitals are preserved, so "Chris-Pratt-ParksAndRec-excited.png"
 * becomes "Chris Pratt ParksAndRec Excited".
 */
export function nameFromFilename(fileName: string): string {
  return basename(fileName, extname(fileName))
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Load the library in a single pass, partitioning entries by whether their
 * backing file still exists on disk. Pure read (no writes): it reports the
 * stale ids rather than deleting them, so the caller can decide to prune (see
 * pruneEntries in ingest.ts). Present memes are returned newest-first.
 *
 * The `existsSync` checks here are the only filesystem stats needed for both
 * listing AND pruning — pruning reuses these results, adding no extra stat cost.
 */
export function loadLibrary(): { memes: Meme[]; missingIds: string[] } {
  const dir = ensureLibraryDir();
  const manifest = loadManifest(getManifestPath());

  const memes: Meme[] = [];
  const missingIds: string[] = [];
  for (const [id, entry] of Object.entries(manifest.items)) {
    const path = join(dir, entry.file);
    if (existsSync(path)) memes.push({ ...entry, id, path });
    else missingIds.push(id);
  }

  memes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { memes, missingIds };
}
