import { readFile } from "node:fs/promises";
import type { Entry, HistoryFile, RawEntry } from "./types";

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function normalize(raw: RawEntry): Entry | null {
  const transcript = (raw.transcript ?? "").trim();
  if (!transcript) return null;
  const source = raw.source ?? "";
  const status = raw.status ?? "";
  const model = raw.transcriptionModelName ?? "";
  return {
    id: raw.id,
    transcript,
    startedAt: raw.startedAt ? new Date(raw.startedAt) : null,
    duration: raw.duration ?? 0,
    source,
    status,
    filePath: raw.filePath ?? "",
    model,
    keywords: [transcript, source, model, status].filter(Boolean),
    wordCount: countWords(transcript),
    costUSD: raw.transcriptionCostUSD ?? 0,
  };
}

function compareByStartedAtDesc(a: Entry, b: Entry): number {
  return (b.startedAt?.getTime() ?? 0) - (a.startedAt?.getTime() ?? 0);
}

export async function loadEntries(path: string): Promise<Entry[]> {
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw) as HistoryFile;
  const entries: Entry[] = [];
  for (const rawEntry of parsed.entries ?? []) {
    const entry = normalize(rawEntry);
    if (entry) entries.push(entry);
  }
  return entries.sort(compareByStartedAtDesc);
}
