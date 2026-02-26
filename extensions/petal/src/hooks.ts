import { useCachedPromise } from "@raycast/utils";
import { existsSync, readFileSync } from "node:fs";
import { HistoryRecord, TranscriptHistoryDay, TranscriptHistoryEntry, TranscriptHistoryVariant } from "./types";
import { PETAL_HISTORY_FILE, resolveHistoryPath } from "./utils";

function decodeTimestamp(value: number | string) {
  if (typeof value === "number") {
    if (value > 1_000_000_000_000) {
      return new Date(value);
    }
    if (value < 1_000_000_000) {
      return new Date((value + 978_307_200) * 1000);
    }
    return new Date(value * 1000);
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  return new Date();
}

function preferredVariant(entry: TranscriptHistoryEntry) {
  const variants = entry.variants ?? [];
  if (variants.length === 0) return null;
  return (
    variants.find((variant) => variant.mode === "smart") ??
    variants.find((variant) => variant.mode === "verbatim") ??
    variants.find((variant) => variant.mode === "original") ??
    variants[0]
  );
}

function readTranscript(entry: TranscriptHistoryEntry, variant: TranscriptHistoryVariant | null) {
  const transcriptPath = resolveHistoryPath(variant?.transcriptRelativePath ?? entry.transcriptRelativePath ?? null);
  if (transcriptPath && existsSync(transcriptPath)) {
    try {
      return { transcript: readFileSync(transcriptPath, "utf8"), transcriptPath };
    } catch {
      return { transcript: "", transcriptPath: null };
    }
  }

  if (entry.transcript) {
    return { transcript: entry.transcript, transcriptPath: null };
  }

  return { transcript: "", transcriptPath: null };
}

function normalizeDays(payload: unknown): TranscriptHistoryDay[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.filter((day): day is TranscriptHistoryDay => {
    return Boolean(day && typeof day === "object" && "day" in day && "entries" in day);
  });
}

function loadHistoryRecords() {
  if (!existsSync(PETAL_HISTORY_FILE)) {
    throw new Error("No history found. Make at least one transcription in Petal first.");
  }

  const raw = readFileSync(PETAL_HISTORY_FILE, "utf8");
  const days = normalizeDays(JSON.parse(raw));

  const records = days.flatMap((day) => {
    const entries = Array.isArray(day.entries) ? day.entries : [];

    return entries.map((entry) => {
      const variant = preferredVariant(entry);
      const { transcript, transcriptPath } = readTranscript(entry, variant);

      return {
        day: day.day,
        entry,
        preferredVariant: variant,
        transcript,
        transcriptPath,
        audioPath: resolveHistoryPath(entry.audioRelativePath ?? null),
        date: decodeTimestamp(entry.timestamp),
      } satisfies HistoryRecord;
    });
  });

  records.sort((a, b) => b.date.getTime() - a.date.getTime());
  return records;
}

export function useHistoryRecords() {
  const {
    data: records,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async () => {
      return loadHistoryRecords();
    },
    [],
    {
      keepPreviousData: true,
    },
  );

  return {
    records: records ?? [],
    isLoading,
    error,
    revalidate,
  };
}
