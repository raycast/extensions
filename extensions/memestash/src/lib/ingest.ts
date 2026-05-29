/**
 * Ingest a source image into the library: hash it, measure it, copy it into the
 * library folder, and upsert its manifest entry. Part of the "read/search +
 * write the library" half — no clipboard/paste concerns live here.
 */
import { trash } from "@raycast/api";
import { execFileSync } from "child_process";
import { createHash } from "crypto";
import {
  copyFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "fs";
import { basename, extname, join } from "path";
import {
  ensureLibraryDir,
  getManifestPath,
  isImagePath,
  nameFromFilename,
} from "./library";
import { loadManifest, saveManifest } from "./manifest";
import { MANIFEST_FILENAME, MemeEntry } from "./types";

/** Stable content id: sha256 of the file's bytes. */
export function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/**
 * Read pixel dimensions via macOS's built-in `sips` — avoids an image-parsing
 * dependency. macOS-only is fine (this extension is macOS-only); the numbers it
 * produces are stored in the manifest and stay platform-neutral from there.
 */
export function imageDimensions(path: string): { w: number; h: number } {
  const out = execFileSync(
    "sips",
    ["-g", "pixelWidth", "-g", "pixelHeight", path],
    { encoding: "utf8" },
  );
  const w = Number(out.match(/pixelWidth:\s*(\d+)/)?.[1]);
  const h = Number(out.match(/pixelHeight:\s*(\d+)/)?.[1]);
  if (!w || !h) throw new Error(`Could not read image dimensions from ${path}`);
  return { w, h };
}

/** Pick a destination basename, avoiding clobbering an unrelated existing file. */
function uniqueDestName(
  dir: string,
  srcBasename: string,
  hash: string,
): string {
  const ext = extname(srcBasename);
  const stem = basename(srcBasename, ext);
  const preferred = `${stem}${ext}`;
  if (!existsSync(join(dir, preferred))) return preferred;
  return `${stem}-${hash.slice(0, 8)}${ext}`;
}

export type AddResult = {
  id: string;
  entry: MemeEntry;
  alreadyExisted: boolean;
};

/**
 * Add (or update) an image in the library. Re-adding the same bytes is detected
 * by hash: we reuse the stored file and just refresh name/keywords/metadata,
 * so duplicates never pile up.
 */
export function addToLibrary(params: {
  sourcePath: string;
  name: string;
  keywords: string[];
}): AddResult {
  const { sourcePath, name, keywords } = params;
  if (!existsSync(sourcePath))
    throw new Error(`Source file not found: ${sourcePath}`);

  const dir = ensureLibraryDir();
  const manifestPath = getManifestPath();
  const manifest = loadManifest(manifestPath);

  const id = sha256File(sourcePath);
  const existing = manifest.items[id];

  let file: string;
  if (existing && existsSync(join(dir, existing.file))) {
    file = existing.file; // same bytes already present — reuse, don't re-copy
  } else {
    file = uniqueDestName(dir, basename(sourcePath), id);
    copyFileSync(sourcePath, join(dir, file));
  }

  const fullPath = join(dir, file);
  const { w, h } = imageDimensions(fullPath);
  const bytes = statSync(fullPath).size;

  const entry: MemeEntry = {
    file,
    name,
    keywords,
    w,
    h,
    bytes,
    updatedAt: new Date().toISOString(),
  };
  manifest.items[id] = entry;
  saveManifest(manifestPath, manifest);

  return { id, entry, alreadyExisted: Boolean(existing) };
}

/** Update an existing entry's name/keywords (not the image itself). */
export function updateMeme(
  id: string,
  fields: { name: string; keywords: string[] },
): MemeEntry {
  const manifestPath = getManifestPath();
  const manifest = loadManifest(manifestPath);
  const existing = manifest.items[id];
  if (!existing) throw new Error("This image is no longer in the library.");

  const entry: MemeEntry = {
    ...existing,
    ...fields,
    updatedAt: new Date().toISOString(),
  };
  manifest.items[id] = entry;
  saveManifest(manifestPath, manifest);
  return entry;
}

/**
 * Remove an entry from the library. The backing file is moved to the macOS
 * Trash (recoverable) rather than hard-deleted before the manifest entry is
 * dropped.
 */
export async function deleteMeme(id: string): Promise<void> {
  const dir = ensureLibraryDir();
  const manifestPath = getManifestPath();
  const manifest = loadManifest(manifestPath);
  const existing = manifest.items[id];
  if (!existing) return;

  const filePath = join(dir, existing.file);
  if (existsSync(filePath)) await trash(filePath);

  delete manifest.items[id];
  saveManifest(manifestPath, manifest);
}

/**
 * Drop the given (already-known-stale) entries from the manifest. Takes ids
 * discovered by loadLibrary's existing stat pass, so it re-reads the small
 * manifest JSON but performs NO additional filesystem stats, and writes only
 * when something actually changes. Cheap enough to call on every load.
 */
export function pruneEntries(ids: string[]): number {
  if (ids.length === 0) return 0;
  const manifestPath = getManifestPath();
  const manifest = loadManifest(manifestPath);

  let removed = 0;
  for (const id of ids) {
    if (manifest.items[id]) {
      delete manifest.items[id];
      removed++;
    }
  }
  if (removed > 0) saveManifest(manifestPath, manifest);
  return removed;
}

export type ReconcileResult = { removed: number; added: number; total: number };

/**
 * Reconcile the manifest with what's actually on disk:
 *  - prune entries whose backing file was deleted outside the extension, and
 *  - import image files sitting in the folder that aren't tracked yet (named
 *    after the filename, no keywords — edit afterwards to add them).
 * Non-destructive to real files; idempotent thanks to hash-keying.
 */
export function reconcileLibrary(): ReconcileResult {
  const dir = ensureLibraryDir();
  const manifestPath = getManifestPath();
  const manifest = loadManifest(manifestPath);

  let removed = 0;
  for (const [id, entry] of Object.entries(manifest.items)) {
    if (!existsSync(join(dir, entry.file))) {
      delete manifest.items[id];
      removed++;
    }
  }

  const referenced = new Set(
    Object.values(manifest.items).map((entry) => entry.file),
  );
  let added = 0;
  for (const name of readdirSync(dir)) {
    if (
      name === MANIFEST_FILENAME ||
      !isImagePath(name) ||
      referenced.has(name)
    )
      continue;
    const filePath = join(dir, name);
    const id = sha256File(filePath);
    if (manifest.items[id]) continue; // same bytes already tracked under another name

    const { w, h } = imageDimensions(filePath);
    manifest.items[id] = {
      file: name,
      name: nameFromFilename(name),
      keywords: [],
      w,
      h,
      bytes: statSync(filePath).size,
      updatedAt: new Date().toISOString(),
    };
    added++;
  }

  saveManifest(manifestPath, manifest);
  return { removed, added, total: Object.keys(manifest.items).length };
}
