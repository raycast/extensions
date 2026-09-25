/**
 * Transcripts on disk, not in LocalStorage.
 *
 * WHY THIS EXISTS — measured, not theorised (2026-08-01):
 *
 * Transcripts are ~91.5% of every cached meeting (~99 kB average, 195 kB
 * largest). Raycast's LocalStorage has an undocumented size ceiling somewhere
 * around 500 kB per extension, and — critically — `setItem` **resolves
 * successfully when the write does not persist**. The extension's own logs
 * showed the failure exactly:
 *
 *     [cache] Wrote 50 meetings { largestPayloadBytes: 185280 }
 *     [CacheManager] Cache updated, now have 5 meetings
 *
 * Fifty successful writes; five survivors. No error, no rejected promise,
 * nothing to catch. That silence is why the bug survived months of
 * investigation: every layer reported success.
 *
 * Moving transcripts to files takes the cache from ~99 kB/meeting to ~8 kB,
 * which fits 500 meetings in ~4 MB instead of ~48 MB.
 *
 * Format is `.md`: Fathom's transcripts already carry `**Speaker** [00:05:32]`
 * markup, and `MeetingTranscriptDetail` renders them straight into a
 * `<Detail markdown={…}>`. Storing the exact bytes the view wants means no
 * conversion step and a file that reads correctly if opened directly.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { logger } from "@chrismessina/raycast-logger";
import { environment } from "@raycast/api";

/** Recording ids are numeric strings from the API; refuse anything that could escape the directory. */
function assertSafeId(recordingId: string): void {
  if (!recordingId || !/^[A-Za-z0-9._-]+$/.test(recordingId) || recordingId.includes("..")) {
    throw new Error(`Unsafe recording id for transcript storage: ${JSON.stringify(recordingId)}`);
  }
}

function transcriptDir(): string {
  const dir = join(environment.supportPath, "transcripts");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function transcriptPath(recordingId: string): string {
  assertSafeId(recordingId);
  return join(transcriptDir(), `${recordingId}.md`);
}

/**
 * Write a transcript to disk.
 *
 * Never throws: a transcript that fails to persist costs a re-fetch when the
 * detail view opens, which is far better than failing the whole cache write
 * that carries the meeting's metadata.
 */
export function saveTranscript(recordingId: string, transcript: string | undefined): boolean {
  // An absent transcript is a NO-OP, never a delete.
  //
  // Callers can legitimately pass undefined: a meeting re-cached from the list
  // path has had `transcriptText` stripped, and the API omits transcripts when
  // `include_transcript` is not requested. Treating that as "erase the file"
  // would destroy a perfectly good transcript on any re-cache — the same class
  // of silent data loss this module was built to end.
  if (!transcript) return false;
  try {
    writeFileSync(transcriptPath(recordingId), transcript, "utf8");
    return true;
  } catch (error) {
    logger.warn(`[transcriptStore] Could not save transcript for ${recordingId}:`, error);
    return false;
  }
}

/** Read a transcript from disk, or undefined when absent. */
export function loadTranscript(recordingId: string): string | undefined {
  try {
    const path = transcriptPath(recordingId);
    if (!existsSync(path)) return undefined;
    return readFileSync(path, "utf8");
  } catch (error) {
    logger.warn(`[transcriptStore] Could not read transcript for ${recordingId}:`, error);
    return undefined;
  }
}

export function hasTranscript(recordingId: string): boolean {
  try {
    return existsSync(transcriptPath(recordingId));
  } catch {
    return false;
  }
}

export function deleteTranscript(recordingId: string): void {
  try {
    const path = transcriptPath(recordingId);
    if (existsSync(path)) unlinkSync(path);
  } catch {
    // Best effort.
  }
}

/**
 * A compact, lowercased word set for full-text search.
 *
 * Search runs synchronously on every keystroke, so it cannot read 500 files.
 * This keeps transcript search working from LocalStorage while the full text
 * lives on disk: deduplicated words are a fraction of the original
 * (~5-10% typically), and word-level matching is what the search actually does.
 *
 * The 2 kB cap is deliberate and load-bearing. The observed LocalStorage
 * ceiling is ~500 kB TOTAL, so the budget per meeting is what matters, not the
 * per-value size:
 *
 *     50 meetings x (8 kB metadata + 8 kB index)  = 800 kB   <- still over
 *     50 meetings x (8 kB metadata + 2 kB index)  = 500 kB   <- at the line
 *     50 meetings x (2 kB metadata + 2 kB index)  = 200 kB   <- comfortable
 *
 * 2 kB holds roughly 250 distinct words, which covers the substantive
 * vocabulary of a meeting; transcripts are highly repetitive, so the tail is
 * mostly filler. Full-fidelity search remains available from the on-disk copy
 * if it is ever wanted.
 */
export function buildSearchIndex(text: string | undefined, maxChars = 2000): string {
  if (!text) return "";

  const words = new Set<string>();
  // Unicode-aware. The previous `[^a-z0-9']+` treated every accented or
  // non-Latin character as a separator, so "Muñoz" indexed as "mu" + "oz" and a
  // Japanese or Cyrillic transcript indexed as nothing at all — the meeting
  // simply stopped being findable by any word in it.
  for (const raw of text.toLowerCase().split(/[^\p{L}\p{N}']+/u)) {
    // Single characters and pure numbers carry no search value.
    if (raw.length < 2 || /^\p{N}+$/u.test(raw)) continue;
    words.add(raw);
  }

  let out = "";
  for (const word of words) {
    // `continue`, not `break`: one oversized token must not zero the whole
    // index. Unspaced scripts (Japanese, Chinese) can yield a single "word"
    // longer than the budget, and breaking there discarded every word after it.
    if (out.length + word.length + 1 > maxChars) continue;
    out += (out ? " " : "") + word;
  }
  return out;
}

/** Remove transcripts whose meetings are no longer cached. */
const PRUNE_GRACE_MS = 60_000;

export function pruneTranscripts(keepRecordingIds: Set<string>, now = Date.now()): number {
  try {
    const dir = transcriptDir();
    let removed = 0;
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".md")) continue;
      const id = name.slice(0, -3);
      if (keepRecordingIds.has(id)) continue;
      try {
        // Written since the caller took its snapshot — another command instance
        // cached this meeting while we were deciding. Leaking a file is
        // recoverable; deleting a live entry's transcript is not.
        if (now - statSync(join(dir, name)).mtimeMs < PRUNE_GRACE_MS) continue;
      } catch {
        // Unreadable: leave it alone rather than guess.
        continue;
      }
      try {
        unlinkSync(join(dir, name));
        removed++;
      } catch {
        // Best effort.
      }
    }
    return removed;
  } catch {
    return 0;
  }
}

/** Total bytes on disk — for diagnostics. */
export function transcriptStoreStats(): { count: number; bytes: number } {
  try {
    const dir = transcriptDir();
    let count = 0;
    let bytes = 0;
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".md")) continue;
      count++;
      try {
        bytes += statSync(join(dir, name)).size;
      } catch {
        // Skip unreadable entries.
      }
    }
    return { count, bytes };
  } catch {
    return { count: 0, bytes: 0 };
  }
}
