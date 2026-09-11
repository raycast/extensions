import fs from "node:fs";
import path from "node:path";
import { DUPLICATES_DIR, REVIEW_DIR, TIDY_DIR } from "./config.js";
import { classify, subClassify } from "./scan.js";
import { resolveDateBucket } from "./date.js";

/**
 * Build the move plan for all source files.
 *
 * Routing, in priority order:
 *   1. byte-identical duplicate  -> <prefix>Duplicates/
 *   2. health issue (junk/empty/corrupt) -> <prefix>Review/<issue>/
 *   3. everything else -> <prefix><Category>/[SubCategory]/[date bucket]/
 *
 * `similar` and `perceptual` never change the destination — they only annotate
 * entries, because both are name/pixel heuristics rather than proof.
 *
 * Targets are reserved as they are assigned, so a name taken by an existing
 * file or by an earlier entry in this same plan already carries its " (n)"
 * suffix in the preview. execute.js still re-checks at move time, since the
 * filesystem can change in between (and case-insensitive volumes can collapse
 * two names this pass considered distinct).
 */
export async function buildPlan({
  sourceFiles,
  duplicates,
  destDir,
  extIndex,
  fallbackCategory,
  // Required, no identity fallback: a forgotten folderName would silently
  // archive into un-prefixed folders instead of failing loudly.
  folderName,
  granularity = {},
  subIndex = new Map(),
  health = new Map(),
  similar = new Map(),
  perceptual = new Map(),
}) {
  const entries = [];
  const reserved = new Set();
  const duplicatesDir = path.join(destDir, validSegment(folderName(DUPLICATES_DIR), "duplicates folder"));
  // The dup manifest's name is claimed up front so a duplicate that happens to
  // be called "manifest.md" gets a suffix instead of landing on the file the
  // dedup records are appended to.
  reserve(path.join(duplicatesDir, "manifest.md"), reserved);

  for (const file of sourceFiles) {
    const annotations = {
      similar: similar.get(file.path),
      perceptual: perceptual.get(file.path),
    };

    const dup = duplicates.get(file.path);
    if (dup) {
      entries.push({
        from: file.path,
        to: reserveTarget(path.join(duplicatesDir, file.name), reserved),
        name: file.name,
        action: "duplicate",
        size: file.size,
        keeperPath: dup.keeper.path,
        hash: dup.hash,
        ...annotations,
      });
      continue;
    }

    const issue = health.get(file.path);
    if (issue) {
      const reviewDir = path.join(destDir, validSegment(folderName(REVIEW_DIR), "review folder"), issue.issue);
      entries.push({
        from: file.path,
        to: reserveTarget(path.join(reviewDir, file.name), reserved),
        name: file.name,
        action: "review",
        issue: issue.issue,
        issueDetail: issue.detail,
        size: file.size,
        ...annotations,
      });
      continue;
    }

    const category = classify(file, extIndex, fallbackCategory);
    const subCategory = subClassify(file, category, subIndex);
    const { bucket, source: dateSource } = await resolveDateBucket(file, granularity[category] ?? "month");
    // Category, sub-category and the folder prefix all come from the user's
    // config file: without this check a hand-edited "../../" would archive
    // outside destDir entirely.
    const segments = [
      destDir,
      validSegment(folderName(category), "category"),
      subCategory && validSegment(subCategory, "sub-category"),
      bucket,
      file.name,
    ].filter(Boolean);
    entries.push({
      from: file.path,
      to: reserveTarget(path.join(...segments), reserved),
      name: file.name,
      action: "archive",
      category,
      subCategory,
      dateBucket: bucket,
      dateSource,
      size: file.size,
      ...annotations,
    });
  }
  return entries;
}

/** Case-folded on Windows, where two spellings of a name are the same file. */
function reserveKey(target) {
  return process.platform === "win32" ? target.toLowerCase() : target;
}

function reserve(target, reserved) {
  reserved.add(reserveKey(target));
  return target;
}

/** The target itself if it's free, otherwise the first free "name (n).ext". */
function reserveTarget(target, reserved) {
  const isFree = (candidate) => !reserved.has(reserveKey(candidate)) && !fs.existsSync(candidate);
  return reserve(firstFreeName(target, isFree), reserved);
}

/**
 * The first name satisfying `isFree`: the target itself, or "name (n).ext"
 * with the lowest free n. Planning and execution both resolve collisions
 * through here, so the suffix format shown in the preview and the one written
 * to disk can never drift apart.
 */
export function firstFreeName(target, isFree) {
  if (isFree(target)) return target;
  const dir = path.dirname(target);
  const ext = path.extname(target);
  const base = path.basename(target, ext);
  for (let i = 1; ; i++) {
    const candidate = path.join(dir, `${base} (${i})${ext}`);
    if (isFree(candidate)) return candidate;
  }
}

/**
 * A single folder name, not a path fragment that could climb out of destDir or
 * take over tidy's own bookkeeping folder.
 * code + label + segment let adapters render this in their own language.
 */
function validSegment(segment, label) {
  const normalized = typeof segment === "string" ? segment.toLowerCase() : "";
  if (
    typeof segment !== "string" ||
    !segment.trim() ||
    segment === "." ||
    segment === ".." ||
    segment.includes("/") ||
    segment.includes("\\") ||
    path.basename(segment) !== segment ||
    normalized === TIDY_DIR ||
    // Control and format characters: a NUL makes every fs call throw a raw
    // TypeError halfway through executing the plan, and a bidi override makes
    // the folder name render as something other than what it is. Letters,
    // digits, punctuation and emoji stay allowed — categories may be in any
    // language.
    /\p{Cc}|\p{Cf}/u.test(segment)
  ) {
    const e = new Error(`Invalid ${label} name: ${String(segment)}`);
    e.code = "INVALID_SEGMENT";
    e.label = label;
    e.segment = String(segment);
    throw e;
  }
  return segment;
}

/**
 * Folder an entry lands in, relative to destDir — derived from the resolved
 * target rather than rebuilt from the parts, so previews show the real folder
 * name including the configured prefix.
 */
export function bucketLabel(entry, destDir) {
  return path.relative(destDir, path.dirname(entry.to));
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)}${units[i]}`;
}
