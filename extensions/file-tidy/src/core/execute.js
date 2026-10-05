import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { tidyPath } from "./config.js";
import { moveFile } from "./move.js";
import { saveHashCache } from "./phash.js";
import { firstFreeName } from "./plan.js";

/**
 * Execute the plan: move every file, resolving name collisions with " (n)"
 * suffixes. The run manifest records the whole plan before the first move and
 * is rewritten whenever a move diverges from it, so undo can restore whatever
 * was moved even if a later step fails. Appends to the Duplicates manifest and,
 * when the run flagged any, to the similar-files report (formatDupBlock and
 * formatSimilarBlock let adapters localize their text). Neither append can fail
 * the run — both happen after the last move, so they come back in reportErrors.
 * `hashCache` is analyze()'s perceptual-hash cache state; it is persisted here
 * rather than during analysis so a preview never writes into the destination.
 * Returns { moved, manifestPath, similarReportPath, reportErrors }.
 */
export function executePlan(
  entries,
  { destDir, sourceDir, hashCache = null, formatDupBlock = defaultDupBlock, formatSimilarBlock = defaultSimilarBlock },
) {
  const runsDir = tidyPath(destDir, "runs");
  fs.mkdirSync(runsDir, { recursive: true });
  const time = new Date().toISOString();
  // The ISO timestamp alone collides for two runs started in the same
  // millisecond, and the second one would overwrite the first one's only undo
  // record. hrtime keeps the names sorting in start order (undo picks the last
  // one); the uuid makes them unique even across processes.
  const order = process.hrtime.bigint().toString().padStart(20, "0");
  const manifestPath = path.join(runsDir, `${time.replace(/[:.]/g, "-")}-${order}-${crypto.randomUUID()}.json`);

  const moved = [];
  // Directories this run actually had to create. Undo removes only these, so a
  // folder that already existed before the run survives being emptied.
  const createdDirs = new Set();
  // The whole plan is recorded up front and rewritten only where reality
  // diverges from it. Rewriting after every single move made a run quadratic:
  // at 4000 files that was 4000 full rewrites of a 1.3MB manifest — ~2.5GB
  // written, and the extension's UI is frozen for all of it.
  const records = entries.map(({ from, to, action }) => ({ from, to, action }));
  // Write-then-rename so a half-written update (e.g. volume fills up) can
  // never truncate the only undo record — the last good manifest survives.
  const writeManifest = () => {
    const tmp = `${manifestPath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ time, sourceDir, moves: records, createdDirs: [...createdDirs] }, null, 2));
    fs.renameSync(tmp, manifestPath);
  };

  // The dup manifest's path is fixed before anything moves, so a duplicate
  // that is itself named "manifest.md" gets a " (n)" suffix instead of landing
  // on the reserved name and having dedup records appended into it.
  // The folder is derived from the entries rather than rebuilt here, so the
  // configured prefix (and the sticky un-prefixed fallback) is honored.
  const dupEntries = entries.filter((e) => e.action === "duplicate");
  const dupManifest = dupEntries.length ? path.join(path.dirname(dupEntries[0].to), "manifest.md") : null;

  writeManifest();
  for (const [i, entry] of entries.entries()) {
    const finalTo = resolveCollision(entry.to, dupManifest);
    // Collected before the mkdir, while "doesn't exist yet" is still true.
    const newDirs = missingDirs(path.dirname(finalTo), destDir);
    // Everything the manifest doesn't already say must reach disk before the
    // move, so a move can never happen without a matching entry. Undo treats a
    // recorded-but-never-performed move (file still at `from`, nothing at `to`)
    // as a no-op, which is what the entries after a failure become.
    if (finalTo !== entry.to || newDirs.length) {
      records[i].to = finalTo;
      for (const dir of newDirs) createdDirs.add(dir);
      writeManifest();
    }
    moved.push({ ...entry, to: finalTo });
    fs.mkdirSync(path.dirname(finalTo), { recursive: true });
    moveFile(entry.from, finalTo);
  }

  // Both reports below were built from pre-move paths. Anything this run moved
  // has to be rewritten to where it actually landed, or the report points at
  // paths that no longer exist. A path this run never touched — a peer that was
  // already in the destination — is already final and maps to itself.
  const finalPath = new Map(moved.map((e) => [e.from, e.to]));
  const atFinalPath = (p) => finalPath.get(p) ?? p;

  // The perceptual-hash cache was only read during analyze — writing it there
  // would create destDir/.tidy as a side effect of a mere preview, before any
  // confirmation and silently past the adapters' "destination doesn't exist,
  // create it?" consent prompt. It lands here instead, keyed to where each
  // image actually ended up, so the next run's archive scan still hits the
  // cache. saveHashCache is best-effort and never throws.
  if (hashCache) {
    const cache = new Map([...hashCache.cache].map(([p, e]) => [atFinalPath(p), e]));
    saveHashCache(
      destDir,
      cache,
      hashCache.images.map((f) => ({ ...f, path: atFinalPath(f.path) })),
    );
  }

  // Both records below are appended once every move has already happened, so a
  // failure here costs a record, not a file. Throwing would report a finished
  // archive as a failed one and invite a retry against a source that has
  // already been emptied — they come back as data instead, and the run stays
  // the success it is.
  const reportErrors = [];
  const recordFailure = (report, target, cause) => {
    // code + report + path let adapters render this in their own language.
    const e = new Error(`Failed to write the ${report} record: ${target}`);
    e.code = "REPORT_WRITE";
    e.report = report;
    e.path = target;
    e.cause = cause;
    reportErrors.push(e);
  };

  const dups = moved.filter((e) => e.action === "duplicate");
  if (dups.length) {
    // The keeper was recorded at its pre-move location; by now it has been
    // archived.
    const resolved = dups.map((d) => ({ ...d, keeperPath: atFinalPath(d.keeperPath) }));
    try {
      fs.mkdirSync(path.dirname(dupManifest), { recursive: true });
      fs.appendFileSync(dupManifest, formatDupBlock(resolved));
    } catch (err) {
      recordFailure("duplicates", dupManifest, err);
    }
  }

  // Near-duplicate and similar-image flags never change where a file goes, so
  // the moment the run ends the grouping becomes invisible: the files sit in
  // their normal archive folders with nothing tying them together, and the plan
  // that knew about it is gone. This report is the only record that outlives
  // the run. It goes beside the run records rather than into the archive tree
  // — these are heuristics, and a folder of its own would imply a verdict the
  // pass is not confident enough to make.
  const flagged = moved.filter((e) => e.similar || e.perceptual);
  let similarReportPath = null;
  if (flagged.length) {
    // Safe outside the try: the same .tidy directory was already resolved for
    // the run record above, so this can no longer be the call that rejects it.
    const reportPath = tidyPath(destDir, "similar.md");
    const resolved = flagged.map((e) => ({
      ...e,
      similar: e.similar && { ...e.similar, peers: e.similar.peers.map(atFinalPath) },
      perceptual: e.perceptual && { ...e.perceptual, peers: e.perceptual.peers.map(atFinalPath) },
    }));
    try {
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      // destDir is passed through so adapters can write paths relative to the
      // archive: the report sits inside it, and a full absolute path repeated
      // on every line buries the file names the reader is actually scanning for.
      fs.appendFileSync(reportPath, formatSimilarBlock(resolved, { destDir }));
      // Only reported once it is on disk: adapters offer to open this path, and
      // a block that never finished writing is not a report worth opening.
      similarReportPath = reportPath;
    } catch (err) {
      recordFailure("similar", reportPath, err);
    }
  }
  return { moved, manifestPath, similarReportPath, reportErrors };
}

/** Directories between `dir` and `stopDir` that don't exist yet, deepest first. */
function missingDirs(dir, stopDir) {
  const missing = [];
  while (dir !== stopDir && dir.startsWith(stopDir + path.sep)) {
    if (fs.existsSync(dir)) break;
    missing.push(dir);
    dir = path.dirname(dir);
  }
  return missing;
}

function resolveCollision(target, reserved = null) {
  return firstFreeName(target, (candidate) => candidate !== reserved && !fs.existsSync(candidate));
}

function defaultDupBlock(dups) {
  const lines = [`\n## ${new Date().toISOString()}\n`];
  for (const d of dups) {
    lines.push(
      `- \`${path.basename(d.to)}\` is byte-identical to the kept copy \`${d.keeperPath}\` (SHA-256: ${d.hash.slice(0, 16)}…)`,
    );
  }
  return lines.join("\n") + "\n";
}

function defaultSimilarBlock(flagged, { destDir }) {
  const lines = [`\n## ${new Date().toISOString()}\n`];
  const peers = (list) => list.map((p) => `\`${relativeToDest(p, destDir)}\``).join(", ");
  for (const e of flagged) {
    const name = relativeToDest(e.to, destDir);
    if (e.similar) {
      lines.push(`- \`${name}\` — ${e.similar.reason}, grouped with ${peers(e.similar.peers)}`);
    }
    if (e.perceptual) {
      const best = e.perceptual.best ? " (largest of the set)" : "";
      lines.push(`- \`${name}\` — looks nearly identical to ${peers(e.perceptual.peers)}${best}`);
    }
  }
  return lines.join("\n") + "\n";
}

/**
 * A path shortened against the archive it lives in. Anything that resolves
 * outside — which a peer never should, but the report must not lie if one does
 * — keeps its absolute path instead of a chain of "..".
 */
export function relativeToDest(p, destDir) {
  const rel = path.relative(destDir, p);
  return rel && !rel.startsWith("..") && !path.isAbsolute(rel) ? rel : p;
}
