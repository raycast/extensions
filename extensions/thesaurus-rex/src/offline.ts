import type { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import {
  acquireInstallLock,
  dbPath,
  getMeta,
  lookup,
  openDb,
  releaseInstallLock,
  SOURCES,
} from "./db.ts";
import type { Entry, Source } from "./db.ts";
import { ingestOewn, OEWN_BYTES, splitDefinition } from "./oewn.ts";

export { OEWN_BYTES, SOURCES };
export type { Entry, Source };

let handle: DatabaseSync | undefined;

function db(dir: string): DatabaseSync {
  if (!handle) handle = openDb(dbPath(dir));
  return handle;
}

export function hasOfflineData(dir: string): boolean {
  if (!existsSync(dbPath(dir))) return false;
  return getMeta(db(dir), "wordnet:synonyms") !== undefined;
}

export function offlineSynonyms(word: string, dir: string): Entry[] {
  return lookup(db(dir), word, "syn");
}

export function offlinePronunciation(
  word: string,
  dir: string,
): string | undefined {
  return lookup(db(dir), word, "pro")[0]?.value;
}

export function offlineAntonyms(word: string, dir: string): Entry[] {
  return lookup(db(dir), word, "ant");
}

export function offlineDefinitions(
  word: string,
  dir: string,
): (Entry & { pos: string; examples: string[] })[] {
  return lookup(db(dir), word, "def").map((entry) => {
    const { pos, text, examples } = splitDefinition(entry.value);
    return { value: text, pos, examples, source: entry.source };
  });
}

export const DICTIONARIES = [
  {
    source: "wordnet" as const,
    supplies: [
      "Definitions",
      "Examples",
      "Synonyms",
      "Antonyms",
      "Pronunciation",
    ],
    licence: "CC BY 4.0",
    bytes: OEWN_BYTES,
  },
];

export function installedCounts(dir: string): Record<Source, number> {
  const handle = db(dir);
  const rows = handle
    .prepare("SELECT source, count(*) AS n FROM entries GROUP BY source")
    .all() as { source: Source; n: number }[];
  const counts = { wordnet: 0 };
  for (const row of rows) counts[row.source] = row.n;
  return counts;
}

export const TOTAL_BYTES = DICTIONARIES.reduce((sum, d) => sum + d.bytes, 0);

export async function downloadDatasets(
  dir: string,
  onBytes?: (bytes: number) => void,
  signal?: AbortSignal,
): Promise<{ synonyms: number; antonyms: number; definitions: number }> {
  if (!acquireInstallLock(dir))
    throw new Error("A dictionary download is already running");
  try {
    return await ingestOewn(db(dir), signal, onBytes);
  } finally {
    releaseInstallLock(dir);
  }
}

export async function removeOfflineData(dir: string): Promise<void> {
  if (!acquireInstallLock(dir))
    throw new Error("A dictionary download is already running");
  try {
    handle?.close();
    handle = undefined;
    const path = dbPath(dir);
    for (const suffix of ["-wal", "-shm", ""]) {
      await rm(path + suffix, { force: true });
    }
  } finally {
    releaseInstallLock(dir);
  }
}
