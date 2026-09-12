import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import { join } from "path";
import { HISTORY_DIR } from "./constants";

export interface HistoryEntry {
  id: string;
  date: Date;
  text: string;
  modelId: string | null;
  duration: number | null;
  audioPath: string;
  jsonPath: string;
  isError: boolean;
}

/** JSON-serializable form for useCachedPromise. */
export type CachedHistoryEntry = Omit<HistoryEntry, "date"> & { date: string };

export function toCachedHistoryEntry(entry: HistoryEntry): CachedHistoryEntry {
  return { ...entry, date: entry.date.toISOString() };
}

export function fromCachedHistoryEntry(
  entry: CachedHistoryEntry,
): HistoryEntry {
  return { ...entry, date: new Date(entry.date) };
}

export interface HistoryPath {
  jsonPath: string;
  mtimeMs: number;
}

const COCOA_EPOCH_OFFSET = 978_307_200;

export function cocoaToDate(seconds: number): Date {
  return new Date((seconds + COCOA_EPOCH_OFFSET) * 1000);
}

export function listHistoryPaths(
  historyDir: string = HISTORY_DIR,
): HistoryPath[] {
  if (!existsSync(historyDir)) return [];
  const out: HistoryPath[] = [];
  for (const dateDir of readdirSync(historyDir)) {
    const fullDateDir = join(historyDir, dateDir);
    let entries: string[];
    try {
      entries = readdirSync(fullDateDir);
    } catch {
      continue;
    }
    for (const file of entries) {
      if (!file.endsWith(".json")) continue;
      const jsonPath = join(fullDateDir, file);
      try {
        const st = statSync(jsonPath);
        out.push({ jsonPath, mtimeMs: st.mtimeMs });
      } catch {
        // ignore unreadable files
      }
    }
  }
  return out;
}

/**
 * Navigate Spokenly's Swift `Result<>` envelope. Real shape (success case):
 *   content.dictation._0.success._0.result
 *
 * We also support a future `transcription` content type, and gracefully flag
 * the failure case.
 */
function extractResult(raw: unknown): { result: unknown; isError: boolean } {
  const root = raw as Record<string, unknown> | null;
  const content = root?.content as Record<string, unknown> | undefined;
  if (!content) return { result: null, isError: false };
  const contentKey = Object.keys(content)[0];
  if (!contentKey) return { result: null, isError: false };
  const inner = content[contentKey] as Record<string, unknown> | undefined;
  const positional = inner?._0 as Record<string, unknown> | undefined;
  if (!positional) return { result: null, isError: false };
  if ("failure" in positional) return { result: null, isError: true };
  const success = positional.success as Record<string, unknown> | undefined;
  const successInner = success?._0 as Record<string, unknown> | undefined;
  return { result: successInner?.result ?? null, isError: false };
}

export function parseEntry(jsonPath: string): HistoryEntry | null {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(jsonPath, "utf-8"));
  } catch {
    return null;
  }
  const top = raw as Record<string, unknown>;
  const id = (top.id as string) ?? "";
  const creationDate = (top.creationDate as number) ?? 0;
  const date = cocoaToDate(creationDate);

  const { result, isError } = extractResult(raw);
  const audioPath = jsonPath.replace(/\.json$/, ".wav");

  if (!result || isError) {
    return {
      id,
      date,
      text: "",
      modelId: null,
      duration: null,
      audioPath,
      jsonPath,
      isError: true,
    };
  }

  const r = result as Record<string, unknown>;
  const transcription = r.transcriptionData as
    | Record<string, unknown>
    | undefined;
  const segments =
    (transcription?.segments as Array<Record<string, unknown>> | undefined) ??
    [];
  const text = segments
    .map((s) => (s.text as string) ?? "")
    .filter(Boolean)
    .join("\n")
    .trim();
  const modelId = (transcription?.modelId as string) ?? null;
  const audioFile = r.audioFile as Record<string, unknown> | undefined;
  const duration = (audioFile?.duration as number) ?? null;

  return {
    id,
    date,
    text,
    modelId,
    duration,
    audioPath,
    jsonPath,
    isError: false,
  };
}

export function listHistory(historyDir: string = HISTORY_DIR): HistoryEntry[] {
  const paths = listHistoryPaths(historyDir);
  const entries: HistoryEntry[] = [];
  for (const p of paths) {
    const entry = parseEntry(p.jsonPath);
    if (entry) entries.push(entry);
  }
  return entries.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function listCachedHistory(
  historyDir: string = HISTORY_DIR,
): Promise<CachedHistoryEntry[]> {
  return listHistory(historyDir).map(toCachedHistoryEntry);
}

export function getLatestEntry(
  historyDir: string = HISTORY_DIR,
): HistoryEntry | null {
  const paths = listHistoryPaths(historyDir);
  if (paths.length === 0) return null;
  // We need creationDate from inside the JSON to be authoritative; parse all
  // and take the max. History files are small (~4 KB minus the bookmark blob),
  // and a single user is unlikely to have hundreds of thousands of them.
  let best: HistoryEntry | null = null;
  for (const p of paths) {
    const entry = parseEntry(p.jsonPath);
    if (!entry) continue;
    if (!best || entry.date.getTime() > best.date.getTime()) best = entry;
  }
  return best;
}
