import fs from "node:fs";
import path from "node:path";
import exifr from "exifr";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import { tidyPath } from "./config.js";
import { pickLargest } from "./similar.js";

/**
 * Perceptual (difference) hashing for images — catches copies byte-level
 * dedup structurally cannot: burst shots, re-exports at another resolution,
 * a messenger's re-compressed version of a photo you also have at full size.
 *
 * Pipeline: decode -> greyscale -> 9x8 box-downsample -> compare each pixel
 * with its right neighbour -> 64-bit hash. Two images are near-identical when
 * the Hamming distance between their hashes is small.
 *
 * Decoding is pure JS on purpose (jpeg-js / pngjs, no native modules) so the
 * Raycast extension stays self-contained. Formats those two can't read (HEIC,
 * RAW, …) fall back to the embedded EXIF thumbnail, which is a JPEG — that
 * covers iPhone/camera libraries. Anything still undecodable is skipped, never
 * fatal: this pass is advisory.
 */

const DIRECT_EXTS = new Set(["jpg", "jpeg", "png"]);
const THUMB_EXTS = new Set(["heic", "heif", "dng", "raw", "tiff", "tif", "avif", "webp", "cr2", "nef", "arw"]);
const HASH_W = 9;
const HASH_H = 8;
/** Skip absurdly large files: a full decode of those costs more than it's worth. */
const MAX_DECODE_BYTES = 80 * 1024 * 1024;

export function isHashableImage(file) {
  return DIRECT_EXTS.has(file.ext) || THUMB_EXTS.has(file.ext);
}

/**
 * Hash every hashable image. Returns Map<path, bigint>; files that couldn't be
 * decoded are simply absent. `cache` (see loadHashCache) short-circuits files
 * whose size and mtime are unchanged — including remembered decode failures —
 * and is updated in place with everything hashed this run.
 */
export async function hashImages(files, { onProgress, cache } = {}) {
  const hashes = new Map();
  let done = 0;
  for (const file of files) {
    if (!isHashableImage(file)) continue;
    const cached = cache?.get(file.path);
    const fresh = cached && cached.size === file.size && cached.mtimeMs === file.mtime?.getTime();
    const hash = fresh ? cached.hash : await hashImage(file);
    if (!fresh) cache?.set(file.path, { size: file.size, mtimeMs: file.mtime?.getTime() ?? 0, hash });
    if (hash !== null) hashes.set(file.path, hash);
    onProgress?.(++done);
  }
  return hashes;
}

const CACHE_NAME = "phash-cache.json";

/**
 * Hash cache persisted under destDir/.tidy — decode cost otherwise grows with
 * the archive on every run. Best-effort on both ends: an unreadable or corrupt
 * cache is just an empty one.
 */
export function loadHashCache(destDir) {
  try {
    const raw = JSON.parse(fs.readFileSync(tidyPath(destDir, CACHE_NAME), "utf8"));
    return new Map(
      Object.entries(raw.entries ?? {}).map(([p, e]) => [
        p,
        { size: e.size, mtimeMs: e.mtimeMs, hash: e.hash === null ? null : BigInt(`0x${e.hash}`) },
      ]),
    );
  } catch {
    return new Map();
  }
}

/**
 * Persist the cache, keeping only entries for `files` — moved/deleted paths
 * drop out. Merges over what is on disk at save time, not what this run loaded:
 * between load and save another run against the same destination may have
 * archived images and saved their hashes, and overwriting with this run's
 * snapshot would throw those entries away. On shared keys this run's entry
 * wins (a stale one just misses its size+mtime check next run and is
 * re-hashed); a disk-only entry survives if its file still exists — the
 * existence check is what keeps the dead-path pruning an overwrite provided.
 */
export function saveHashCache(destDir, cache, files) {
  const keep = new Set(files.map((f) => f.path));
  const toJSON = (e) => ({ size: e.size, mtimeMs: e.mtimeMs, hash: e.hash === null ? null : e.hash.toString(16) });
  const entries = {};
  for (const [p, e] of loadHashCache(destDir)) {
    if (!keep.has(p) && fs.existsSync(p)) entries[p] = toJSON(e);
  }
  for (const [p, e] of cache) {
    if (keep.has(p)) entries[p] = toJSON(e);
  }
  try {
    const file = tidyPath(destDir, CACHE_NAME);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ entries }));
  } catch {
    // Cache is an optimization only — never let it fail a run.
  }
}

async function hashImage(file) {
  const pixels = await decodeGrey(file);
  return pixels ? dHash(pixels) : null;
}

/** { data: Uint8Array (greyscale), width, height } or null. */
async function decodeGrey(file) {
  if (DIRECT_EXTS.has(file.ext) && file.size <= MAX_DECODE_BYTES) {
    // Read failures are as advisory as decode failures: the file may simply
    // have been moved away since the scan, and this pass never justifies
    // aborting the run.
    const buf = readOrNull(file.path);
    const direct = buf && decodeBuffer(buf, file.ext);
    if (direct) return direct;
  }
  // HEIC/RAW/etc, or a JPEG/PNG that failed to decode: try the EXIF thumbnail.
  try {
    const thumb = await exifr.thumbnail(file.path);
    if (thumb) return decodeBuffer(Buffer.from(thumb), "jpg");
  } catch {
    // No thumbnail or unreadable container — give up on this file.
  }
  return null;
}

function readOrNull(filePath) {
  try {
    return fs.readFileSync(filePath);
  } catch {
    return null;
  }
}

function decodeBuffer(buf, ext) {
  try {
    if (ext === "png") {
      const png = PNG.sync.read(buf);
      return toGrey(png.data, png.width, png.height, 4);
    }
    const img = jpeg.decode(buf, { useTArray: true, maxMemoryUsageInMB: 512 });
    return toGrey(img.data, img.width, img.height, 4);
  } catch {
    return null;
  }
}

/** Rec. 601 luma, the standard weighting for perceptual greyscale. */
function toGrey(data, width, height, channels) {
  const out = new Uint8Array(width * height);
  for (let i = 0, p = 0; p < out.length; i += channels, p++) {
    out[p] = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
  }
  return { data: out, width, height };
}

/**
 * Box-average down to 9x8, then set one bit per horizontal neighbour pair.
 * Averaging (rather than nearest-neighbour sampling) is what makes the hash
 * survive rescaling and JPEG recompression.
 */
function dHash({ data, width, height }) {
  const small = new Float64Array(HASH_W * HASH_H);
  for (let y = 0; y < HASH_H; y++) {
    const y0 = Math.floor((y * height) / HASH_H);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * height) / HASH_H));
    for (let x = 0; x < HASH_W; x++) {
      const x0 = Math.floor((x * width) / HASH_W);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * width) / HASH_W));
      let sum = 0;
      let n = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          sum += data[yy * width + xx];
          n++;
        }
      }
      small[y * HASH_W + x] = sum / n;
    }
  }
  let hash = 0n;
  for (let y = 0; y < HASH_H; y++) {
    for (let x = 0; x < HASH_W - 1; x++) {
      hash <<= 1n;
      if (small[y * HASH_W + x] > small[y * HASH_W + x + 1]) hash |= 1n;
    }
  }
  return hash;
}

function hammingDistance(a, b) {
  const diff = a ^ b;
  return popcount32(Number(diff & 0xffffffffn)) + popcount32(Number(diff >> 32n));
}

/** Integer bit-twiddle popcount — a BigInt loop allocates per iteration and stalls on large pairwise scans. */
function popcount32(x) {
  x -= (x >>> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  x = (x + (x >>> 4)) & 0x0f0f0f0f;
  return (x * 0x01010101) >>> 24;
}

/**
 * Cluster images whose hashes are within `threshold` bits of each other.
 * Single-link clustering over a small set — image counts here are in the
 * thousands at most, so the pairwise scan is fine.
 *
 * Returns Map<path, { peers: string[], best: boolean }>, where `best` marks
 * the largest file in the cluster (usually the original, least-recompressed
 * copy).
 */
export function clusterByHash(hashes, filesByPath, threshold = 5) {
  const paths = [...hashes.keys()];
  const parent = new Map(paths.map((p) => [p, p]));
  const find = (p) => {
    while (parent.get(p) !== p) {
      parent.set(p, parent.get(parent.get(p)));
      p = parent.get(p);
    }
    return p;
  };
  const union = (a, b) => {
    const [ra, rb] = [find(a), find(b)];
    if (ra !== rb) parent.set(ra, rb);
  };

  for (let i = 0; i < paths.length; i++) {
    for (let j = i + 1; j < paths.length; j++) {
      if (hammingDistance(hashes.get(paths[i]), hashes.get(paths[j])) <= threshold) union(paths[i], paths[j]);
    }
  }

  const clusters = new Map();
  for (const p of paths) {
    const root = find(p);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root).push(p);
  }

  const result = new Map();
  for (const members of clusters.values()) {
    if (members.length < 2) continue;
    const best = pickLargest(members, (p) => filesByPath.get(p)?.size ?? 0);
    for (const p of members) {
      result.set(p, { peers: members.filter((m) => m !== p), best: p === best });
    }
  }
  return result;
}
