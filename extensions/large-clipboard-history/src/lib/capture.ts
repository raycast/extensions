import { Cache, Clipboard } from "@raycast/api";
import { createHash } from "crypto";
import { PREVIEW_CHAR_LIMIT, RAYCAST_HISTORY_CHAR_CAP, withVault } from "./db";
import { getMaxEntries } from "./preferences";

const LAST_HASH_CACHE_KEY = "last-large-clip-sha256";
const cache = new Cache();

type SaveResult = { saved: boolean; charCount: number; sha256: string };

export type CaptureOutcome =
  | { kind: "saved"; charCount: number; sha256: string; preview: string }
  | { kind: "duplicate"; charCount: number; sha256: string; preview: string }
  | { kind: "below-threshold"; charCount: number }
  | { kind: "empty" };

export function hashText({ text }: { text: string }) {
  return createHash("sha256").update(text).digest("hex");
}

export async function saveClip({ text, sha256: precomputed }: { text: string; sha256?: string }): Promise<SaveResult> {
  const sha256 = precomputed ?? hashText({ text });
  const charCount = text.length;
  const preview = text.slice(0, PREVIEW_CHAR_LIMIT);
  const createdAt = Date.now();

  return withVault({
    run: (db) => {
      // INSERT OR IGNORE + UNIQUE(sha256) gives atomic dedupe; .changes tells us if the row was new
      const info = db
        .prepare(
          `INSERT OR IGNORE INTO clips (sha256, content, char_count, preview, created_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(sha256, text, charCount, preview, createdAt);
      return { saved: Number(info.changes) > 0, charCount, sha256 };
    },
  });
}

export async function evictOldEntries() {
  const max = getMaxEntries();
  return withVault({
    run: (db) => {
      db.prepare(
        `DELETE FROM clips
         WHERE id NOT IN (
           SELECT id FROM clips ORDER BY created_at DESC LIMIT ?
         )`,
      ).run(max);
    },
  });
}

// Clipboard.readText() returns undefined for image-only / file-only clipboards, so we naturally
// skip non-text content here without needing to inspect Clipboard.read()'s file/html branches
export async function captureFromClipboard(): Promise<CaptureOutcome> {
  const text = await Clipboard.readText();
  if (!text) return { kind: "empty" };
  const charCount = text.length;
  if (charCount <= RAYCAST_HISTORY_CHAR_CAP) {
    return { kind: "below-threshold", charCount };
  }

  const sha256 = hashText({ text });
  const preview = text.slice(0, PREVIEW_CHAR_LIMIT);
  // shared sentinel across both capture paths — DB roundtrip skipped when this clip was the last one any path saw
  if (cache.get(LAST_HASH_CACHE_KEY) === sha256) {
    return { kind: "duplicate", charCount, sha256, preview };
  }

  const result = await saveClip({ text, sha256 });
  cache.set(LAST_HASH_CACHE_KEY, sha256);
  if (result.saved) await evictOldEntries();
  return {
    kind: result.saved ? "saved" : "duplicate",
    charCount,
    sha256,
    preview,
  };
}
