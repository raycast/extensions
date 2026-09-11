import path from "node:path";

/**
 * The shared keeper policy for size-based passes: the largest copy is the best
 * source (least recompressed, fullest scan). `sizeOf` adapts item shapes.
 */
export function pickLargest(items, sizeOf = (f) => f.size) {
  return items.reduce((a, b) => (sizeOf(b) > sizeOf(a) ? b : a));
}

/**
 * Near-duplicate detection: files that are almost certainly the same thing but
 * not byte-identical, so findDuplicates() can never see them. Three passes:
 *
 *   normalized-name  same name once copy markers / source watermarks / date
 *                    stamps / URL-escape debris are stripped
 *   same-stem        identical stem, different extension (one document kept as
 *                    pdf and epub, one image as png and webp, …)
 *   versioned        release archives whose only difference is a version number
 *                    (app-1.0.5.dmg vs app-1.0.6.dmg) — newest wins
 *
 * These are heuristics over names, not proof of equal content, so results are
 * advisory: the plan flags them and the adapters show them. Nothing is
 * quarantined on this signal alone.
 *
 * Returns Map<path, { reason, peers: string[], best: boolean }> where `best`
 * marks the copy this module would keep.
 */
export function findSimilar(files) {
  const flagged = new Map();
  // A file already grouped by an earlier (more specific) pass isn't regrouped.
  const claimed = new Set();

  for (const pass of [versionGroups, normalizedNameGroups, stemGroups]) {
    for (const group of pass(files.filter((f) => !claimed.has(f.path)))) {
      if (group.members.length < 2) continue;
      for (const f of group.members) claimed.add(f.path);
      const best = group.best;
      for (const f of group.members) {
        flagged.set(f.path, {
          reason: group.reason,
          best: f.path === best.path,
          peers: group.members.filter((m) => m.path !== f.path).map((m) => m.path),
        });
      }
    }
  }
  return flagged;
}

// ---------- pass 1: version-numbered releases ----------

const VERSION_RE = /^(.*?)[ _-]v?(\d+(?:\.\d+){1,3})(.*)$/;

function versionGroups(files) {
  const groups = new Map();
  for (const f of files) {
    const stem = path.basename(f.name, path.extname(f.name));
    const m = VERSION_RE.exec(stem);
    if (!m) continue;
    const [, head, version, tail] = m;
    if (!head.trim()) continue;
    const key = `${head.toLowerCase().trim()}|${tail.toLowerCase().trim()}|${f.ext}`;
    push(groups, key, { ...f, _version: version });
  }
  return [...groups.values()].map((members) => ({
    reason: "versioned",
    members,
    best: members.reduce((a, b) => (compareVersions(a._version, b._version) >= 0 ? a : b)),
  }));
}

function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

// ---------- pass 2: normalized names ----------

/** Noise that says nothing about which document this is. */
const NOISE = [
  /%[0-9a-f]{2}/gi, // URL-escape debris from browser downloads
  /\s*\(\d+\)/g, // Finder / browser copy counter
  /\b(?:copy|副本|拷贝|final|最终|new|旧|old)\b/gi,
  /\b(?:v|ver|version)?\s*\d{1,2}(?:\.\d+){1,3}\b/gi, // version numbers
  /\b\d{8,14}\b/g, // 20141105085833-style stamps
  /\b\d{4}[-_.]\d{2}[-_.]\d{2}\b/g, // 2014-11-05
  /\b(?:scan|扫描版|影印版|高清|完整版|中文版|文字版|电子书|下载版)\b/gi,
  /\b(?:www\.)?[a-z0-9-]+\.(?:net|com|cn|org)\b/gi, // source-site watermarks
];

function normalizeName(name) {
  let s = path.basename(name, path.extname(name)).normalize("NFKC");
  for (const re of NOISE) s = s.replace(re, " ");
  // Strip everything that isn't a letter, digit or CJK ideograph.
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

function normalizedNameGroups(files) {
  const groups = new Map();
  for (const f of files) {
    const key = normalizeName(f.name);
    // Too short to be a meaningful match ("a", "1", "" …).
    if (key.length < 4) continue;
    push(groups, `${key}|${f.ext}`, f);
  }
  return [...groups.values()].map((members) => ({
    reason: "normalized-name",
    members,
    best: pickLargest(members),
  }));
}

// ---------- pass 3: same stem, different extension ----------

function stemGroups(files) {
  const groups = new Map();
  for (const f of files) {
    const stem = normalizeName(f.name);
    if (stem.length < 4) continue;
    push(groups, stem, f);
  }
  return [...groups.values()]
    .filter((members) => new Set(members.map((f) => f.ext)).size > 1)
    .map((members) => ({
      reason: "same-stem",
      members,
      best: pickLargest(members),
    }));
}

function push(map, key, value) {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}
