import type { HistorySettings, SessionMetadata } from "./types";

export interface RetentionResult {
  kept: SessionMetadata[];
  removed: SessionMetadata[];
  bytes: number;
  overLimit: boolean;
}

export function selectSessionsToKeep(
  sessions: SessionMetadata[],
  settings: HistorySettings,
  maxBytes: number,
  protectedId?: string,
): RetentionResult {
  const newestFirst = [...sessions].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  const keep = new Set(newestFirst.map((item) => item.id));

  if (settings.sessionLimit !== "unlimited") {
    for (const item of newestFirst.slice(settings.sessionLimit))
      keep.delete(item.id);
  }

  let kept = newestFirst.filter((item) => keep.has(item.id));
  let bytes = kept.reduce((sum, item) => sum + item.bytes, 0);
  for (const item of [...kept].reverse()) {
    if (bytes <= maxBytes) break;
    if (item.id === protectedId) continue;
    keep.delete(item.id);
    bytes -= item.bytes;
  }

  kept = newestFirst.filter((item) => keep.has(item.id));
  bytes = kept.reduce((sum, item) => sum + item.bytes, 0);
  return {
    kept,
    removed: newestFirst.filter((item) => !keep.has(item.id)),
    bytes,
    overLimit: bytes > maxBytes,
  };
}
