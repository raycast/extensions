import crypto from "node:crypto";
import fs from "node:fs";

const QUICK_CHUNK = 64 * 1024;

/** Hash of the first and last 64KB — cheap prefilter for same-size files. */
function quickHash(filePath, size) {
  const fd = fs.openSync(filePath, "r");
  try {
    const hash = crypto.createHash("sha256");
    const head = Buffer.alloc(Math.min(QUICK_CHUNK, size));
    fs.readSync(fd, head, 0, head.length, 0);
    hash.update(head);
    if (size > QUICK_CHUNK) {
      const tail = Buffer.alloc(Math.min(QUICK_CHUNK, size - QUICK_CHUNK));
      fs.readSync(fd, tail, 0, tail.length, size - tail.length);
      hash.update(tail);
    }
    return hash.digest("hex");
  } finally {
    fs.closeSync(fd);
  }
}

function fullHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    fs.createReadStream(filePath)
      .on("data", (chunk) => hash.update(chunk))
      .on("end", () => resolve(hash.digest("hex")))
      .on("error", reject);
  });
}

/**
 * Byte-level duplicate detection, filename-independent:
 * size groups -> head+tail quick hash -> full SHA-256.
 *
 * sourceFiles/destFiles: [{ path, name, size, ... }]. Dest files join size
 * groups so new files duplicating already-archived ones are caught too.
 *
 * Returns Map<sourcePath, { keeper, hash }> for source files judged duplicates.
 * Dest files are never moved; they only serve as keepers.
 */
export async function findDuplicates(sourceFiles, destFiles) {
  const bySize = new Map();
  for (const f of sourceFiles) addTo(bySize, f.size, { ...f, inDest: false });
  const sourceSizes = new Set(sourceFiles.map((f) => f.size));
  for (const f of destFiles) {
    if (sourceSizes.has(f.size)) addTo(bySize, f.size, { ...f, inDest: true });
  }

  const duplicates = new Map();
  for (const [size, group] of bySize) {
    if (group.length < 2 || size === 0) continue;

    const byQuick = new Map();
    for (const f of group) addTo(byQuick, quickHash(f.path, size), f);

    for (const quickGroup of byQuick.values()) {
      if (quickGroup.length < 2) continue;
      const byFull = new Map();
      for (const f of quickGroup) addTo(byFull, await fullHash(f.path), f);

      for (const [hash, identical] of byFull) {
        if (identical.length < 2) continue;
        const keeper = pickKeeper(identical);
        for (const f of identical) {
          if (f !== keeper && !f.inDest) duplicates.set(f.path, { keeper, hash });
        }
      }
    }
  }
  return duplicates;
}

function addTo(map, key, value) {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

/**
 * Prefer the already-archived copy; among new files prefer the most
 * "original-looking" name (no " (1)" / "copy" / "副本" markers, then shorter),
 * then the older file.
 */
function pickKeeper(identical) {
  const scored = identical.map((f) => ({ f, penalty: namePenalty(f.name) }));
  scored.sort(
    (a, b) =>
      b.f.inDest - a.f.inDest ||
      a.penalty - b.penalty ||
      a.f.name.length - b.f.name.length ||
      a.f.birthtime - b.f.birthtime,
  );
  return scored[0].f;
}

function namePenalty(name) {
  let penalty = 0;
  if (/\s\(\d+\)(\.[^.]+)?$/.test(name)) penalty += 2;
  if (/\bcopy\b|副本|拷贝/i.test(name)) penalty += 2;
  return penalty;
}
