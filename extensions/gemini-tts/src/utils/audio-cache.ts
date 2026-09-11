import { environment } from "@raycast/api";
import { createHash } from "crypto";
import { existsSync, mkdirSync, readdirSync, renameSync, statSync, unlinkSync, utimesSync, writeFileSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import type { TTSOptions } from "../api/types";

const CACHE_DIR_NAME = "audio-cache";
const MAX_BYTES = 200 * 1024 * 1024;
const SWEEP_BATCH_TARGET = 0.85;

// Bump this whenever the synthesis prompt builder changes meaningfully
// (e.g. a director-profile rewrite, a new audio-tag mode). Old entries
// keyed under a previous version will simply miss and be regenerated;
// the LRU sweep cleans them out over time.
//
// v2: rolled back the systemInstruction split — TTS preview models
// reject `systemInstruction` with HTTP 400 "Developer instruction is
// not enabled for this model". The prompt is back inline in `contents`,
// so any v1 entries (which would have come from a pre-regression
// state) are invalidated to be safe.
const CACHE_VERSION = "v2";

let cachedDir: string | null = null;

/**
 * Ensure the cache directory exists and return its path. Lazy so we
 * don't pay the fs cost on commands that never synthesize.
 */
function getCacheDir(): string {
  if (cachedDir) return cachedDir;
  const dir = join(environment.supportPath, CACHE_DIR_NAME);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  cachedDir = dir;
  return dir;
}

/**
 * Stable hash for a synthesis request. Speed is intentionally NOT in
 * the hash because afplay applies it at playback time — the cached
 * audio is reusable across speed changes.
 */
export function hashSynthesisRequest(text: string, options: TTSOptions): string {
  const payload = JSON.stringify({
    v: CACHE_VERSION,
    text,
    voiceId: options.voiceId,
    model: options.model,
    languageMode: options.languageMode,
    readingExperience: options.readingExperience,
    expressiveness: options.expressiveness,
    audioTagMode: options.audioTagMode,
    speakerMode: options.speakerMode,
    secondaryVoiceId: options.secondaryVoiceId,
    directorNotes: options.directorNotes,
    sampleRate: options.sampleRate,
  });
  return createHash("sha256").update(payload).digest("hex");
}

export interface CacheEntry {
  path: string;
  hit: boolean;
}

export function lookupCache(hash: string): string | null {
  const path = pathForHash(hash);
  if (!existsSync(path)) return null;
  try {
    const now = new Date();
    utimesSync(path, now, now);
  } catch {
    // ignore mtime touch failures
  }
  return path;
}

/**
 * Store a wav buffer in cache. Writes to a temp file first then
 * renames so partial writes never produce a half-baked cache entry.
 * Returns the final path on success, or null if the write failed —
 * caller should fall back to a managed temp file.
 */
export function storeCache(hash: string, wavBuffer: Buffer): string | null {
  const finalPath = pathForHash(hash);
  const tmpPath = `${finalPath}.${randomUUID()}.tmp`;
  try {
    writeFileSync(tmpPath, new Uint8Array(wavBuffer));
    renameSync(tmpPath, finalPath);
  } catch {
    try {
      if (existsSync(tmpPath)) unlinkSync(tmpPath);
    } catch {
      // ignore
    }
    return null;
  }

  scheduleSweep();
  return finalPath;
}

function pathForHash(hash: string): string {
  return join(getCacheDir(), `${hash}.wav`);
}

let sweepScheduled = false;

function scheduleSweep(): void {
  if (sweepScheduled) return;
  sweepScheduled = true;
  setImmediate(() => {
    sweepScheduled = false;
    try {
      sweepLRU();
    } catch {
      // never let cache maintenance crash playback
    }
  });
}

function sweepLRU(): void {
  const dir = getCacheDir();
  const entries = readdirSync(dir)
    .filter((name) => name.endsWith(".wav"))
    .map((name) => {
      const fullPath = join(dir, name);
      try {
        const stats = statSync(fullPath);
        return { path: fullPath, size: stats.size, mtime: stats.mtimeMs };
      } catch {
        return null;
      }
    })
    .filter((entry): entry is { path: string; size: number; mtime: number } => entry !== null);

  const totalBytes = entries.reduce((sum, entry) => sum + entry.size, 0);
  if (totalBytes <= MAX_BYTES) return;

  entries.sort((a, b) => a.mtime - b.mtime);
  const target = MAX_BYTES * SWEEP_BATCH_TARGET;
  let running = totalBytes;
  for (const entry of entries) {
    if (running <= target) break;
    try {
      unlinkSync(entry.path);
      running -= entry.size;
    } catch {
      // ignore individual delete failures
    }
  }
}

export interface CacheStats {
  fileCount: number;
  totalBytes: number;
}

export function getCacheStats(): CacheStats {
  try {
    const dir = getCacheDir();
    const names = readdirSync(dir).filter((name) => name.endsWith(".wav"));
    let totalBytes = 0;
    for (const name of names) {
      try {
        totalBytes += statSync(join(dir, name)).size;
      } catch {
        // ignore individual stat failures
      }
    }
    return { fileCount: names.length, totalBytes };
  } catch {
    return { fileCount: 0, totalBytes: 0 };
  }
}

export function clearCache(): CacheStats {
  const stats = getCacheStats();
  try {
    const dir = getCacheDir();
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".wav") && !name.endsWith(".tmp")) continue;
      try {
        unlinkSync(join(dir, name));
      } catch {
        // ignore individual delete failures
      }
    }
  } catch {
    // ignore directory-level failures
  }
  return stats;
}

export function formatCacheSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
