/**
 * Data model for the MemeStash library.
 *
 * The library is one folder of image files plus a single `index.json` manifest,
 * which is the single source of truth. Entries are keyed by a stable sha256
 * content hash (NOT by filename) so the same image is recognised even if its
 * filename changes, and so a future iOS keyboard can share the exact same IDs.
 *
 * Everything here is platform-neutral and portable on purpose: `file` is a
 * basename (not an absolute path), so the whole folder can move into iCloud
 * Drive without rewriting the manifest.
 */

export type MemeEntry = {
  /** Basename of the image file, relative to the library folder. Keeps the folder portable. */
  file: string;
  name: string;
  keywords: string[];
  /** Pixel width. */
  w: number;
  /** Pixel height. */
  h: number;
  /** File size in bytes. */
  bytes: number;
  /** ISO 8601 (UTC) timestamp of the last add/update. */
  updatedAt: string;
};

export type Manifest = {
  /** Schema version — a migration hook for future portability/iOS changes. */
  version: number;
  /** Keyed by sha256 hex of the file's bytes. */
  items: Record<string, MemeEntry>;
};

/** A manifest entry joined with its resolved absolute path and hash id, for UI use. */
export type Meme = MemeEntry & { id: string; path: string };

export const MANIFEST_VERSION = 1;
export const MANIFEST_FILENAME = "index.json";

/** Image extensions we accept into the library. */
export const IMAGE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".heic",
  ".bmp",
  ".tiff",
  ".tif",
];
