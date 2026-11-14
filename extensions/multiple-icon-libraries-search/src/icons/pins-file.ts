// Favorite icons live in a small JSON file in the extension's support folder, one list per library, so
// they can be backed up, synced, or edited by other tools. The file keeps the name they had before
// 2026-11-08, pins. Earlier versions kept them in LocalStorage; those are merged in once (see
// useLibraryMemory).

import { existsSync, readFileSync, renameSync, unwatchFile, watchFile, writeFileSync, type Stats } from "node:fs";
import { join } from "node:path";
import { LibraryId } from "./types";

export const PINS_FILE = "pins.json";

/** `{ "hugeicons": ["ticket-01"], "lucide": ["ticket"] }`: each library's pins in display order. */
export type PinsFile = Partial<Record<LibraryId, string[]>>;

export function pinsPath(supportPath: string): string {
  return join(supportPath, PINS_FILE);
}

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((name): name is string => typeof name === "string" && name.length > 0))];
}

/** The whole file; a missing or unreadable file counts as no pins. */
export function readPinsFile(path: string): PinsFile {
  if (!existsSync(path)) return {};
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const file: PinsFile = {};
    for (const [library, names] of Object.entries(parsed as Record<string, unknown>)) {
      file[library as LibraryId] = cleanList(names);
    }
    return file;
  } catch {
    return {};
  }
}

export function readPins(path: string, library: LibraryId): string[] {
  return readPinsFile(path)[library] ?? [];
}

/**
 * Applies `update` to the library's pins as they are on disk now, so a change another tool made while
 * the command was open is kept, then saves the file in one step (write a copy, then rename).
 */
export function updatePins(path: string, library: LibraryId, update: (pins: string[]) => string[]): string[] {
  const file = readPinsFile(path);
  const next = cleanList(update(file[library] ?? []));
  file[library] = next;
  savePinsFile(path, file);
  return next;
}

function savePinsFile(path: string, file: PinsFile): void {
  writeFileSync(`${path}.tmp`, JSON.stringify(file, null, 2) + "\n");
  renameSync(`${path}.tmp`, path);
}

/** Old LocalStorage pins first, in their order, then any pins the file already had. */
export function mergeLegacyPins(legacy: string[], current: string[]): string[] {
  return [...new Set([...cleanList(legacy), ...current])];
}

/**
 * Creates the pins file when it is missing, and moves in the pins an earlier version kept in LocalStorage
 * (`legacy`, per library), each library's old pins first.
 */
export function adoptPins(path: string, legacy: PinsFile): PinsFile {
  const file = readPinsFile(path);
  for (const [library, names] of Object.entries(legacy) as [LibraryId, string[]][]) {
    file[library] = mergeLegacyPins(names, file[library] ?? []);
  }
  savePinsFile(path, file);
  return file;
}

/**
 * Calls `onChange` when the file changes. Polls the path rather than holding the file open, so it keeps
 * working when a writer replaces the file by renaming a copy over it.
 */
export function watchPins(path: string, onChange: () => void, intervalMs = 1000): () => void {
  const listener = (current: Stats, previous: Stats) => {
    if (current.mtimeMs !== previous.mtimeMs) onChange();
  };
  watchFile(path, { interval: intervalMs }, listener);
  return () => unwatchFile(path, listener);
}
