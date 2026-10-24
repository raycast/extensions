import { createReadStream, createWriteStream } from "node:fs";
import type { ReadStream } from "node:fs";
import { open, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";

export const ACTIVE_INDEX_FILENAME = "index.nul";
export const LEGACY_INDEX_REGEX = /^index-[a-f0-9-]+\.nul$/;
export const LEGACY_GRACE_MS = 24 * 60 * 60 * 1000;
const MAGIC = Buffer.from("PSIDX002", "ascii");
const PREFIX_SIZE = 12;
const MAX_HEADER_BYTES = 64 * 1024;

export type SavedIndexMetadata = {
  version: 1 | 2;
  filename: string;
  createdAt: string;
  count: number;
  roots: string[];
  /** Byte offset of the first NUL-delimited path; 0 for older index files. */
  dataOffset?: number;
};

function validateMetadata(raw: unknown): SavedIndexMetadata {
  if (
    !raw ||
    typeof raw !== "object" ||
    !("version" in raw) ||
    raw.version !== 2 ||
    !("count" in raw) ||
    !Number.isSafeInteger(raw.count) ||
    (raw.count as number) < 0 ||
    !("createdAt" in raw) ||
    typeof raw.createdAt !== "string" ||
    !("roots" in raw) ||
    !Array.isArray(raw.roots) ||
    !raw.roots.every((root: unknown) => typeof root === "string")
  ) {
    throw new Error("Invalid PathSeek index header; rebuild the index");
  }
  const payload = raw as Record<string, unknown>;
  return {
    version: 2,
    filename: ACTIVE_INDEX_FILENAME,
    createdAt: payload.createdAt as string,
    count: payload.count as number,
    roots: payload.roots as string[],
  };
}

/**
 * Serialize metadata and NUL-delimited file paths into ONE self-contained
 * index file. It is staged and validated before an atomic rename.
 *
 * [8B ASCII MAGIC][4B little-endian JSON length][JSON][path\0path\0...]
 * The first 12+N bytes MUST be skipped before feeding the path data to fzf.
 */
export async function prepareIndex(
  rawPathsFile: string,
  stagedPath: string,
  metadata: Omit<SavedIndexMetadata, "filename" | "dataOffset">,
): Promise<SavedIndexMetadata> {
  const rawMetadata = {
    version: 2,
    createdAt: metadata.createdAt,
    count: metadata.count,
    roots: metadata.roots,
  };
  const json = Buffer.from(JSON.stringify(rawMetadata), "utf8");
  if (json.length > MAX_HEADER_BYTES)
    throw new Error("Index metadata exceeds header size limit");
  const prefix = Buffer.alloc(PREFIX_SIZE);
  MAGIC.copy(prefix);
  prefix.writeUInt32LE(json.length, MAGIC.length);
  await writeFile(stagedPath, Buffer.concat([prefix, json]), { flag: "wx" });
  let seenPaths = 0;
  let lastByte: number | undefined;
  const counter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      for (const byte of chunk) if (byte === 0) seenPaths++;
      if (chunk.length) lastByte = chunk[chunk.length - 1];
      callback(null, chunk);
    },
  });
  await pipeline(
    createReadStream(rawPathsFile),
    counter,
    createWriteStream(stagedPath, { flags: "a" }),
  );
  if (seenPaths !== metadata.count || (seenPaths > 0 && lastByte !== 0)) {
    throw new Error(
      "Invalid index paths: wrong NUL separator count or trailing byte",
    );
  }
  const parsed = await readIndexHeader(stagedPath);
  if (
    parsed.count !== metadata.count ||
    parsed.roots.length !== metadata.roots.length
  ) {
    throw new Error("Index metadata verification failed");
  }
  const info = await stat(stagedPath);
  if (
    info.size !==
    (await stat(rawPathsFile)).size + PREFIX_SIZE + json.length
  ) {
    throw new Error("Index payload copy incomplete");
  }
  return parsed;
}

async function readHeader(handle: FileHandle): Promise<SavedIndexMetadata> {
  const prefix = Buffer.alloc(PREFIX_SIZE);
  const first = await handle.read(prefix, 0, PREFIX_SIZE, 0);
  if (
    first.bytesRead !== PREFIX_SIZE ||
    !prefix.subarray(0, MAGIC.length).equals(MAGIC)
  ) {
    throw new Error("Unsupported index format; run Rebuild Index");
  }
  const length = prefix.readUInt32LE(MAGIC.length);
  if (!length || length > MAX_HEADER_BYTES)
    throw new Error("Invalid index header length");
  const info = await handle.stat();
  if (PREFIX_SIZE + length > info.size)
    throw new Error("Incomplete index header");
  const json = Buffer.alloc(length);
  const result = await handle.read(json, 0, length, PREFIX_SIZE);
  if (result.bytesRead !== length) throw new Error("Incomplete index metadata");
  const metadata = validateMetadata(
    JSON.parse(json.toString("utf8")) as unknown,
  );
  return { ...metadata, dataOffset: PREFIX_SIZE + length };
}

export async function readIndexHeader(
  indexPath: string,
): Promise<SavedIndexMetadata> {
  const handle = await open(indexPath, "r");
  try {
    return await readHeader(handle);
  } finally {
    await handle.close();
  }
}

/**
 * Open exactly ONE file descriptor and parse its own header before streaming
 * its paths. Atomic rebuilds may occur between UI metadata-read and search.
 * Using the offset from THIS open descriptor avoids accidentally applying
 * the previous generation's offset to the new generation.
 */
export async function openIndexDataStream(
  indexPath: string,
): Promise<ReadStream> {
  const handle = await open(indexPath, "r");
  try {
    let offset = 0;
    if (path.basename(indexPath) === ACTIVE_INDEX_FILENAME) {
      offset = (await readHeader(handle)).dataOffset ?? 0;
    }
    // FileHandle-created stream keeps the same inode after atomic rename,
    // even if new builds publish a file with a differently sized header.
    return handle.createReadStream({ start: offset, autoClose: true });
  } catch (error) {
    await handle.close();
    throw error;
  }
}

/** Atomically replace the fixed active file after preparing a complete index. */
export async function publishIndex(
  tempPath: string,
  indexDirectory: string,
): Promise<void> {
  const activePath = path.join(indexDirectory, ACTIVE_INDEX_FILENAME);
  const info = await stat(tempPath);
  if (!info.isFile()) throw new Error("Staged index is not a regular file");
  await readIndexHeader(tempPath);
  await rename(tempPath, activePath);
}

/**
 * Only remove old UUID-format indexes after the new self-contained index is
 * published. Protect recently written files for a compatibility grace period.
 * Never delete index.nul or a file referenced by legacy metadata until after
 * that grace period. Empty/missing legacy state cannot remove the new index.
 */
export async function cleanupLegacyIndexes(
  indexDirectory: string,
  now = Date.now(),
  graceMs = LEGACY_GRACE_MS,
): Promise<number> {
  await readIndexHeader(path.join(indexDirectory, ACTIVE_INDEX_FILENAME));
  let removed = 0;
  for (const filename of await readdir(indexDirectory)) {
    if (!LEGACY_INDEX_REGEX.test(filename)) continue;
    const filePath = path.join(indexDirectory, filename);
    const info = await stat(filePath).catch(() => null);
    if (!info || now - info.mtimeMs < graceMs) continue;
    await rm(filePath, { force: true });
    removed++;
  }
  return removed;
}

/**
 * Clean up abandoned build artifacts only while holding the exclusive rebuild
 * lock. This helper must NEVER run on Search Files startup or ordinary query.
 * The 24-hour safety margin avoids deleting a recently active build's data.
 */
export async function cleanupStaleBuildTemps(
  indexDirectory: string,
  now = Date.now(),
  graceMs = LEGACY_GRACE_MS,
): Promise<number> {
  let removed = 0;
  const tempPattern = /^index-[a-f0-9-]+\.(?:paths|nul)\.tmp$/;
  for (const filename of await readdir(indexDirectory)) {
    if (!tempPattern.test(filename)) continue;
    const fullPath = path.join(indexDirectory, filename);
    const info = await stat(fullPath).catch(() => null);
    if (!info || !info.isFile() || now - info.mtimeMs < graceMs) continue;
    await rm(fullPath, { force: true });
    removed++;
  }
  return removed;
}
