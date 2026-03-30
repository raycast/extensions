#!/usr/bin/env node
/**
 * Standalone ingest pipeline runner.
 * Spawned as a detached process by the Raycast extension so the pipeline
 * survives the extension being closed/killed.
 *
 * Usage: node runner.mjs <config.json>
 *
 * Config JSON contains all pipeline options + file list. The runner handles
 * scanning, filtering, collision resolution, copying, verification, renaming,
 * opening Photo Mechanic, and ejecting cards.
 *
 * Progress and completion are communicated via the PID file (read by the menu bar UI).
 */

import { readdir, mkdir, stat, appendFile, readFile, writeFile, rename, unlink, copyFile } from "fs/promises";
import { appendFileSync as appendFileSyncSync, unlinkSync as unlinkSyncSync } from "fs";
import { createHash } from "crypto";
import { createReadStream } from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { homedir } from "os";

const execFileAsync = promisify(execFile);
const DISKUTIL = "/usr/sbin/diskutil";
// Try Homebrew ARM first (Apple Silicon), then Intel location, then PATH fallback
const EXIFTOOL_CANDIDATES = ["/opt/homebrew/bin/exiftool", "/usr/local/bin/exiftool", "exiftool"];
let EXIFTOOL = EXIFTOOL_CANDIDATES[0]; // default, overridden at startup

const IMAGE_EXTENSIONS = [".cr2", ".cr3", ".arw", ".nef", ".dng", ".jpg", ".jpeg", ".heic"];
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".mxf"];
const SIDECAR_EXTENSIONS = [".xmp"];
const ALL_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS, ...SIDECAR_EXTENSIONS]);
const LOG_FILE = path.join(homedir(), "Library", "Logs", "raycast-photo-ingest.log");
const PID_FILE = path.join(homedir(), "Library", "Logs", "raycast-photo-ingest.pid");

// ── Logging ──────────────────────────────────────────────────────────────────

async function logLine(msg) {
  const ts = new Date().toISOString();
  await appendFile(LOG_FILE, `${ts}  ${msg}\n`, "utf-8");
}

async function logSessionStart(cards, dest) {
  const div = "=".repeat(60);
  await logLine(div);
  await logLine("INGEST SESSION START");
  await logLine(`Source cards: ${cards.join(", ")}`);
  await logLine(`Destination: ${dest}`);
  await logLine(div);
}

async function logSessionEnd(s) {
  await logLine("--- SESSION SUMMARY ---");
  await logLine(`Files copied: ${s.copied}`);
  await logLine(`Skipped (duplicate): ${s.skipped}`);
  await logLine(`Collisions resolved: ${s.collisions}`);
  await logLine(`Verified: ${s.verified}, Failed: ${s.verifyFailed}`);
  await logLine(`Renamed: ${s.renamed}`);
  await logLine(`Duration: ${(s.durationMs / 1000).toFixed(1)}s`);
  if (s.errors.length > 0) {
    await logLine("Errors:");
    for (const e of s.errors) await logLine(`  - ${e}`);
  }
  await logLine("--- END ---\n");
}


// ── Scanner ──────────────────────────────────────────────────────────────────

async function scanVolume(volumePath, volumeName) {
  const files = [];
  async function walk(dir) {
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); }
    catch { return; }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".")) await walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ALL_EXTENSIONS.has(ext)) {
          files.push({
            absolutePath: fullPath,
            basename: entry.name,
            baseStem: path.basename(entry.name, path.extname(entry.name)),
            extension: ext,
            volumeName,
            volumePath,
            isSidecar: SIDECAR_EXTENSIONS.includes(ext),
          });
        }
      }
    }
  }
  await walk(volumePath);
  return files;
}

async function scanMultipleVolumes(volumes) {
  const results = await Promise.all(volumes.map(v => scanVolume(v.path, v.name)));
  return results.flat();
}

// ── Date filtering (fast, via fs.stat mtime) ─────────────────────────────────

async function batchStatDates(filePaths) {
  const dates = new Map();
  const BATCH = 200;
  for (let i = 0; i < filePaths.length; i += BATCH) {
    const batch = filePaths.slice(i, i + BATCH);
    const stats = await Promise.allSettled(batch.map(fp => stat(fp)));
    for (let j = 0; j < batch.length; j++) {
      const r = stats[j];
      if (r.status === "fulfilled") {
        const m = r.value.mtime;
        const d = `${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,"0")}-${String(m.getDate()).padStart(2,"0")}`;
        dates.set(batch[j], d);
      }
    }
  }
  return dates;
}

// ── Star rating (exiftool, only when needed) ─────────────────────────────────

async function batchReadRatings(filePaths) {
  const ratings = new Map();
  const BATCH = 500;
  for (let i = 0; i < filePaths.length; i += BATCH) {
    const batch = filePaths.slice(i, i + BATCH);
    try {
      const { stdout } = await execFileAsync(EXIFTOOL, ["-Rating", "-json", "-quiet", ...batch], { maxBuffer: 50*1024*1024 });
      for (const r of JSON.parse(stdout)) ratings.set(r.SourceFile, r.Rating ?? 0);
    } catch {
      for (const fp of batch) ratings.set(fp, 0);
    }
  }
  return ratings;
}

// ── Filter ───────────────────────────────────────────────────────────────────

async function filterFiles(files, targetDates, starRating) {
  const media = files.filter(f => !f.isSidecar);
  const sidecars = files.filter(f => f.isSidecar);
  const dateSet = new Set(targetDates);
  const fileDates = await batchStatDates(media.map(f => f.absolutePath));
  const dateMatched = media.filter(f => { const d = fileDates.get(f.absolutePath); return d && dateSet.has(d); });
  const afterDateFilter = dateMatched.length;

  let starMatched;
  if (starRating !== null && dateMatched.length > 0) {
    const ratings = await batchReadRatings(dateMatched.map(f => f.absolutePath));
    starMatched = dateMatched.filter(f => (ratings.get(f.absolutePath) ?? 0) === starRating);
  } else {
    starMatched = dateMatched;
  }

  const matchedStems = new Set(starMatched.map(f => f.baseStem));
  const matchedSidecars = [];
  const orphanSidecars = [];
  for (const s of sidecars) {
    if (matchedStems.has(s.baseStem)) matchedSidecars.push(s);
    else orphanSidecars.push(s.absolutePath);
  }

  return {
    matched: [...starMatched, ...matchedSidecars],
    totalScanned: files.length,
    afterDateFilter,
    afterStarFilter: starMatched.length,
    orphanSidecars,
  };
}

// ── Collisions ───────────────────────────────────────────────────────────────

function sanitizeVolumeName(name) { return name.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20); }

function resolveCollisions(files) {
  const groups = new Map();
  for (const f of files) {
    const key = f.basename.toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(f);
  }
  const resolved = [];
  let collisionCount = 0;
  for (const [, group] of groups) {
    if (group.length === 1) {
      resolved.push({ ...group[0], destFilename: group[0].basename });
    } else {
      collisionCount += group.length - 1;
      const volSet = new Set(group.map(f => f.volumeName));
      if (volSet.size > 1) {
        for (const f of group) {
          const sfx = sanitizeVolumeName(f.volumeName);
          const ext = path.extname(f.basename);
          const stem = path.basename(f.basename, ext);
          resolved.push({ ...f, destFilename: `${stem}_${sfx}${ext}` });
        }
      } else {
        for (let i = 0; i < group.length; i++) {
          const f = group[i];
          if (i === 0) resolved.push({ ...f, destFilename: f.basename });
          else {
            const ext = path.extname(f.basename);
            const stem = path.basename(f.basename, ext);
            resolved.push({ ...f, destFilename: `${stem}_${i+1}${ext}` });
          }
        }
      }
    }
  }
  return { resolved, collisionCount };
}

async function skipDuplicates(files, destDir) {
  let existing;
  try { existing = new Set((await readdir(destDir)).map(e => e.toLowerCase())); }
  catch { existing = new Set(); }
  const toIngest = [];
  let skippedCount = 0;
  for (const f of files) {
    if (existing.has(f.destFilename.toLowerCase())) skippedCount++;
    else toIngest.push(f);
  }
  return { toIngest, skippedCount };
}

// ── Copy ─────────────────────────────────────────────────────────────────────

// Size threshold for showing byte-level progress (100 MB)
const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024;

async function copyFiles(files, destDir, onProgress, progressState) {
  const results = [];
  const errors = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const destPath = path.join(destDir, f.destFilename);
    try {
      const fileStat = await stat(f.absolutePath);
      const isLarge = fileStat.size >= LARGE_FILE_THRESHOLD && progressState;

      // For large files, poll destination size to show byte-level progress
      let pollTimer = null;
      if (isLarge) {
        progressState.currentFile = f.basename;
        progressState.filePercent = 0;
        pollTimer = setInterval(async () => {
          try {
            const destStat = await stat(destPath);
            const pct = Math.round((destStat.size / fileStat.size) * 100);
            if (pct !== progressState.filePercent) {
              progressState.filePercent = pct;
              await onProgress("copying", i, files.length);
            }
          } catch { /* dest doesn't exist yet */ }
        }, 2000);
      }

      // fs.copyFile uses macOS copyfile(2) — optimised kernel-level copy
      await copyFile(f.absolutePath, destPath);

      if (pollTimer) {
        clearInterval(pollTimer);
        delete progressState.currentFile;
        delete progressState.filePercent;
      }

      results.push({ success: true, sourcePath: f.absolutePath, destPath });
      await logLine(`Copied: ${f.basename} → ${f.destFilename}`);
    } catch (err) {
      const errMsg = `Copy failed: ${f.basename} — ${String(err)}`;
      errors.push(errMsg);
      results.push({ success: false, sourcePath: f.absolutePath, destPath, error: errMsg });
      await logLine(errMsg);

      // Abort immediately on disk full — no point trying remaining files
      if (err.code === "ENOSPC") {
        const copied = results.filter(r => r.success).length;
        await logLine(`DISK FULL — aborting copy after ${copied} of ${files.length} files`);
        if (progressState) {
          progressState.error = `Disk full — copied ${copied} of ${files.length} files`;
        }
        break;
      }
    }
    // Update progress after every file
    if (onProgress) await onProgress("copying", i + 1, files.length);
  }
  return { results, errors };
}

// ── Verify ───────────────────────────────────────────────────────────────────

function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", chunk => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

async function verifyFiles(copyResults, onProgress) {
  const ok = copyResults.filter(r => r.success);
  const results = [];
  const errors = [];
  let passed = 0, failed = 0;
  for (let i = 0; i < ok.length; i++) {
    const c = ok[i];
    try {
      const [sh, dh] = await Promise.all([hashFile(c.sourcePath), hashFile(c.destPath)]);
      if (sh === dh) { passed++; results.push({ destPath: c.destPath, sourcePath: c.sourcePath, passed: true }); }
      else {
        failed++;
        const msg = `Verification FAILED: ${c.destPath} (hash mismatch)`;
        errors.push(msg); results.push({ destPath: c.destPath, sourcePath: c.sourcePath, passed: false });
        await logLine(msg);
      }
    } catch (err) {
      failed++;
      const msg = `Verification error: ${c.destPath} — ${String(err)}`;
      errors.push(msg); results.push({ destPath: c.destPath, sourcePath: c.sourcePath, passed: false });
      await logLine(msg);
    }
    if (onProgress) await onProgress("verifying", i + 1, ok.length);
  }
  return { results, passed, failed, errors };
}

// ── Rename ───────────────────────────────────────────────────────────────────

async function renameFilesInDir(copyResults, verifyResults, folderName) {
  const failedPaths = new Set();
  if (verifyResults) {
    for (const vr of verifyResults) { if (!vr.passed) failedPaths.add(vr.destPath); }
  }
  const eligible = copyResults.filter(r => r.success && !failedPaths.has(r.destPath));
  const mediaFiles = eligible.filter(r => !SIDECAR_EXTENSIONS.includes(path.extname(r.destPath).toLowerCase()));
  const sidecarFiles = eligible.filter(r => SIDECAR_EXTENSIONS.includes(path.extname(r.destPath).toLowerCase()));

  const renamedStems = new Set();
  const errors = [];
  let renamed = 0;

  for (const f of [...mediaFiles, ...sidecarFiles]) {
    const dir = path.dirname(f.destPath);
    const fname = path.basename(f.destPath);
    const ext = path.extname(fname).toLowerCase();
    const stem = path.basename(fname, path.extname(fname));
    if (SIDECAR_EXTENSIONS.includes(ext) && !renamedStems.has(stem)) continue;
    const newName = `${folderName}_${fname}`;
    try {
      await rename(f.destPath, path.join(dir, newName));
      renamed++;
      if (!SIDECAR_EXTENSIONS.includes(ext)) renamedStems.add(stem);
      await logLine(`Renamed: ${fname} → ${newName}`);
    } catch (err) {
      errors.push(`Rename failed: ${fname} — ${String(err)}`);
      await logLine(`Rename failed: ${fname} — ${String(err)}`);
    }
  }
  return { renamed, errors };
}

// ── Main Pipeline ────────────────────────────────────────────────────────────

async function killPreviousIngest() {
  try {
    const raw = await readFile(PID_FILE, "utf-8");
    const prev = JSON.parse(raw);
    if (prev.pid && prev.pid !== process.pid) {
      try {
        process.kill(prev.pid, 0); // check if alive
        process.kill(prev.pid, "SIGTERM"); // kill it
        await logLine(`Killed previous runner process ${prev.pid}`);
        // Give it a moment to clean up
        await new Promise(r => setTimeout(r, 1000));
      } catch { /* already dead, that's fine */ }
    }
  } catch { /* no PID file or invalid JSON */ }
}

async function resolveExiftool() {
  const { stat: fsStat } = await import("fs/promises");
  for (const candidate of EXIFTOOL_CANDIDATES) {
    try {
      if (candidate !== "exiftool") {
        await fsStat(candidate);
      } else {
        // For PATH fallback, verify it runs
        await execFileAsync(candidate, ["-ver"]);
      }
      return candidate;
    } catch {
      // not found, try next
    }
  }
  return EXIFTOOL_CANDIDATES[0]; // last resort default
}

async function main() {
  // Resolve exiftool path at startup
  EXIFTOOL = await resolveExiftool();

  const configPath = process.argv[2];
  if (!configPath) { console.error("Usage: runner.mjs <config.json>"); process.exit(1); }

  const opts = JSON.parse(await readFile(configPath, "utf-8"));
  // Clean up config file — no longer needed
  try { await unlink(configPath); } catch { /* ignore */ }

  // Kill any previous ingest that's still running
  await killPreviousIngest();

  const destDir = path.join(opts.destParent, opts.folderName);

  // Progress state — shared across pipeline stages
  const progressState = {
    pid: process.pid,
    startedAt: new Date().toISOString(),
    destDir,
    cards: opts.volumes.map(v => ({ name: v.name, fileCount: 0 })),
    stage: "scanning",
    progress: { current: 0, total: 0 },
    error: null,
  };

  // Serialise writes — prevent overlapping writeFile/rename on .tmp
  let writeInFlight = false;
  let writePending = false;

  async function writeProgress(stage, current, total) {
    progressState.stage = stage;
    progressState.progress = { current, total };

    if (writeInFlight) {
      writePending = true;   // coalesce — latest state will be written when current write finishes
      return;
    }
    writeInFlight = true;
    try {
      do {
        writePending = false;
        const tmp = PID_FILE + ".tmp";
        await writeFile(tmp, JSON.stringify(progressState), "utf-8");
        await rename(tmp, PID_FILE);
      } while (writePending);
    } finally {
      writeInFlight = false;
    }
  }

  // Write initial PID/progress file (atomic)
  const tmpInit = PID_FILE + ".tmp";
  await writeFile(tmpInit, JSON.stringify(progressState), "utf-8");
  await rename(tmpInit, PID_FILE);

  // Always clean up PID file on exit
  const removePid = async () => { try { await unlink(PID_FILE); } catch { /* ignore */ } };
  for (const sig of ["SIGTERM", "SIGINT", "SIGHUP"]) {
    process.on(sig, async () => {
      await logLine(`Received ${sig} — stopping`);
      await removePid();
      process.exit(0);
    });
  }
  process.on("uncaughtException", async (err) => {
    await logLine(`Uncaught exception: ${String(err)}`);
    await removePid();
    process.exit(1);
  });
  process.on("unhandledRejection", async (reason) => {
    await logLine(`Unhandled rejection: ${String(reason)}`);
    await removePid();
    process.exit(1);
  });
  process.on("exit", (code) => {
    try { appendFileSyncSync(LOG_FILE, `${new Date().toISOString()}  Process exiting with code ${code}\n`); } catch { /* ignore */ }
    try { unlinkSyncSync(PID_FILE); } catch { /* ignore */ }
  });
  const startTime = Date.now();
  const allErrors = [];

  try {
    await logSessionStart(opts.volumes.map(v => v.name), destDir);
    await logLine("Starting ingest...");

    await mkdir(destDir, { recursive: true });

    // Scan
    await writeProgress("scanning", 0, 0);
    const allFiles = await scanMultipleVolumes(opts.volumes);
    await logLine(`Scanned ${allFiles.length} matching files`);

    // Update per-card file counts
    for (const card of progressState.cards) {
      card.fileCount = allFiles.filter(f => f.volumeName === card.name && !f.isSidecar).length;
    }

    if (allFiles.length === 0) {

      await logLine("ERROR: No matching files found");
      return;
    }

    // Filter
    await writeProgress("filtering", 0, allFiles.length);

    const fr = await filterFiles(allFiles, opts.targetDates, opts.starRating);
    await logLine(`${fr.afterDateFilter} match date, ${fr.afterStarFilter} match star, ${fr.matched.length} total`);
    if (fr.matched.length === 0) {

      await logLine("ERROR: No files match filters");
      return;
    }

    // Collisions & dedup
    const { resolved, collisionCount } = resolveCollisions(fr.matched);
    let filesToCopy, skippedCount = 0;
    if (opts.skipDuplicates) {
      const dd = await skipDuplicates(resolved, destDir);
      filesToCopy = dd.toIngest;
      skippedCount = dd.skippedCount;
    } else {
      filesToCopy = resolved;
    }

    if (filesToCopy.length === 0) {

      await logSessionEnd({ copied: 0, skipped: skippedCount, collisions: collisionCount, verified: 0, verifyFailed: 0, renamed: 0, errors: [], durationMs: Date.now() - startTime });
      return;
    }

    await logLine(`${filesToCopy.length} to copy (${skippedCount} skipped, ${collisionCount} collisions)`);
    await writeProgress("copying", 0, filesToCopy.length);


    // Copy (with progress updates)
    const { results: copyResults, errors: copyErrors } = await copyFiles(filesToCopy, destDir, writeProgress, progressState);
    const copiedCount = copyResults.filter(r => r.success).length;
    allErrors.push(...copyErrors);

    // Verify
    let verifyResults = null, verifiedCount = 0, verifyFailedCount = 0;
    if (opts.verifyCopy) {
      await writeProgress("verifying", 0, copiedCount);

      const vr = await verifyFiles(copyResults, writeProgress);
      verifyResults = vr.results;
      verifiedCount = vr.passed;
      verifyFailedCount = vr.failed;
      allErrors.push(...vr.errors);
    }

    // Rename
    let renamedCount = 0;
    if (opts.renameFiles) {
      await writeProgress("renaming", 0, copiedCount);

      const rr = await renameFilesInDir(copyResults, verifyResults, opts.folderName);
      renamedCount = rr.renamed;
      allErrors.push(...rr.errors);
    }

    // Open Photo Mechanic
    if (opts.openPhotoMechanic) {
      try { await execFileAsync("/usr/bin/open", ["-a", "Photo Mechanic 6", destDir]); }
      catch { await logLine("Warning: Could not open Photo Mechanic"); }
    }

    // Eject
    if (opts.ejectCards) {
      await writeProgress("ejecting", 0, opts.volumes.length);
      for (const vol of opts.volumes) {
        try {
          await execFileAsync(DISKUTIL, ["eject", vol.path]);
          await logLine(`Ejected: ${vol.name}`);
        } catch (err) {
          await logLine(`Eject failed: ${vol.name} — ${String(err)}`);
          allErrors.push(`Eject failed: ${vol.name}`);
        }
      }
    }

    // Done
    const durationMs = Date.now() - startTime;
    const seconds = (durationMs / 1000).toFixed(1);
    await logSessionEnd({ copied: copiedCount, skipped: skippedCount, collisions: collisionCount, verified: verifiedCount, verifyFailed: verifyFailedCount, renamed: renamedCount, errors: allErrors, durationMs });



  } catch (err) {
    await logLine(`Pipeline error: ${String(err)}`);

  } finally {
    // Write "done" stage so the UI can detect completion and clear the subtitle
    await writeProgress("done", 0, 0);
    // Give the UI a few poll cycles to see the "done" state before removing the file
    await new Promise(r => setTimeout(r, 5000));
    await removePid();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
