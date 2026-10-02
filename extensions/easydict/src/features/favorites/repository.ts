/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { environment, LocalStorage } from "@raycast/api";

import type { QueryInput } from "@/core/results/types";
import { normalizeError } from "@/shared/errors";
import { isRecord } from "@/shared/validation";

import { decodeFavoriteSnapshot, decodeLegacyFavorites } from "./decode";
import { favoriteKeyOf, type FavoriteWord } from "./model";

const FAVORITE_CONTENT_KEY = "favorite-content-v1";
const LEGACY_FAVORITES_KEY = "favorite-words";

type StoredValue = string | number | boolean;
interface FavoriteStorageSource {
  readonly key: typeof FAVORITE_CONTENT_KEY | typeof LEGACY_FAVORITES_KEY;
  readonly raw: StoredValue | undefined;
}

export type FavoriteStorageState =
  | { kind: "ready"; favorites: FavoriteWord[]; source: FavoriteStorageSource }
  | { kind: "invalid" | "unsupported"; message: string; source: FavoriteStorageSource }
  | { kind: "error"; message: string };

function decodeContentEnvelope(value: unknown): FavoriteWord[] {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.favorites)) {
    throw new Error("Saved favorites must use a version 1 content envelope.");
  }
  return value.favorites.map(decodeFavoriteSnapshot);
}

function decodeFavoriteStorage(source: FavoriteStorageSource): FavoriteStorageState {
  if (source.raw === undefined) return { kind: "ready", favorites: [], source };
  try {
    if (typeof source.raw !== "string") throw new Error("Saved favorites must be JSON text.");
    const value: unknown = JSON.parse(source.raw);
    if (
      isRecord(value) &&
      typeof value.version === "number" &&
      Number.isInteger(value.version) &&
      (source.key === LEGACY_FAVORITES_KEY || value.version !== 1)
    ) {
      return {
        kind: "unsupported",
        source,
        message: "This favorites format requires a compatible version of Easydict. Your data is unchanged.",
      };
    }
    const favorites = source.key === FAVORITE_CONTENT_KEY ? decodeContentEnvelope(value) : decodeLegacyFavorites(value);
    return { kind: "ready", favorites, source };
  } catch (error) {
    return {
      kind: "invalid",
      source,
      message: `${normalizeError(error).message} Your saved data is unchanged. Export it or restore a valid backup in Favorite Words.`,
    };
  }
}

/** Selected backups may contain either the previous array or the current content envelope. */
export function decodeFavoriteBackup(raw: string): FavoriteWord[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? decodeLegacyFavorites(value) : decodeContentEnvelope(value);
  } catch {
    throw new Error("The selected file is not a valid favorites backup for this version.");
  }
}

async function selectSource(): Promise<FavoriteStorageSource> {
  const raw = await LocalStorage.getItem(FAVORITE_CONTENT_KEY);
  return raw !== undefined
    ? { key: FAVORITE_CONTENT_KEY, raw }
    : { key: LEGACY_FAVORITES_KEY, raw: await LocalStorage.getItem(LEGACY_FAVORITES_KEY) };
}

export async function readFavoriteWords(): Promise<FavoriteStorageState> {
  try {
    return decodeFavoriteStorage(await selectSource());
  } catch (error) {
    return { kind: "error", message: `Unable to read favorites: ${normalizeError(error).message}` };
  }
}

// Serialize mutations in this command instance; each mutation also reads current shared storage.
let writeQueue: Promise<unknown> = Promise.resolve();
function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const pending = writeQueue.then(operation, operation);
  writeQueue = pending.catch(() => undefined);
  return pending;
}

function encodeFavorites(favorites: FavoriteWord[]): string {
  return JSON.stringify({ version: 1, favorites });
}

async function mutateFavorites(update: (favorites: FavoriteWord[]) => FavoriteWord[]): Promise<void> {
  return enqueue(async () => {
    const state = await readFavoriteWords();
    if (state.kind !== "ready") throw new Error(state.message);
    await LocalStorage.setItem(FAVORITE_CONTENT_KEY, encodeFavorites(update(state.favorites)));
  });
}

export function toggleFavoriteWord(entry: FavoriteWord): Promise<void> {
  const key = favoriteKeyOf(entry.query);
  return mutateFavorites((favorites) =>
    favorites.some((item) => favoriteKeyOf(item.query) === key)
      ? favorites.filter((item) => favoriteKeyOf(item.query) !== key)
      : [entry, ...favorites],
  );
}

export function removeFavoriteWord(identity: Pick<QueryInput, "word" | "fromLanguage" | "toLanguage">): Promise<void> {
  const key = favoriteKeyOf(identity);
  return mutateFavorites((favorites) => favorites.filter((item) => favoriteKeyOf(item.query) !== key));
}

export function clearFavoriteWords(): Promise<void> {
  return mutateFavorites(() => []);
}

async function writeBackup(raw: StoredValue): Promise<string> {
  const directory = join(environment.supportPath, "favorite-backups");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const path = join(directory, `favorites-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}.json`);
  await writeFile(path, typeof raw === "string" ? raw : JSON.stringify(raw), {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  return path;
}

export async function exportFavoriteWords(): Promise<string> {
  const state = await readFavoriteWords();
  if (state.kind === "error") throw new Error(state.message);
  if (state.source.raw === undefined) throw new Error("There is no saved favorites data to export.");
  return writeBackup(state.source.raw);
}

async function preserveAndReplace(
  source: FavoriteStorageSource,
  favorites: FavoriteWord[],
): Promise<string | undefined> {
  const backupPath = source.raw === undefined ? undefined : await writeBackup(source.raw);
  // File I/O can outlive another command's write, including its first creation of the new key.
  const latest = await selectSource();
  if (latest.key !== source.key || latest.raw !== source.raw) {
    throw new Error("Favorites changed while preparing the backup. Reload and try restoring again.");
  }
  await LocalStorage.setItem(FAVORITE_CONTENT_KEY, encodeFavorites(favorites));
  return backupPath;
}

/** Restore an explicitly selected valid backup without changing the previous-version key. */
export async function restoreFavoriteWords(path: string): Promise<string | undefined> {
  const favorites = decodeFavoriteBackup(await readFile(path, "utf8"));
  return enqueue(async () => {
    const current = await readFavoriteWords();
    if (current.kind === "error" || current.kind === "unsupported") throw new Error(current.message);
    return preserveAndReplace(current.source, favorites);
  });
}

/** Explicit recovery only; the previous-version collection is never used to replace a present new key automatically. */
export function restoreLegacyFavoriteWords(): Promise<string | undefined> {
  return enqueue(async () => {
    const current = await readFavoriteWords();
    if (current.kind === "error" || current.kind === "unsupported") throw new Error(current.message);
    const raw = await LocalStorage.getItem(LEGACY_FAVORITES_KEY);
    if (raw === undefined) throw new Error("There are no previous-version favorites to restore.");
    const restored = decodeFavoriteStorage({ key: LEGACY_FAVORITES_KEY, raw });
    if (restored.kind !== "ready") throw new Error("Previous-version favorites are not valid for recovery.");
    return preserveAndReplace(current.source, restored.favorites);
  });
}
