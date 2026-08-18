import { LocalStorage, environment } from "@raycast/api";
import { logger } from "@chrismessina/raycast-logger";
import { join } from "node:path";

import { withFileLock } from "./atomic-file";
import { pruneCachedLibraries, removeCachedLibrary } from "./library-cache";
import type { LibrarySummary, SavedLibrary } from "./types";

const STORAGE_KEY = "my-libraries";
/** Written by the versions of this extension that called the feature "favorites". */
const LEGACY_STORAGE_KEY = "favorite-libraries";

/**
 * The manifest lives in LocalStorage, which offers no compare-and-swap and no lock of its
 * own, so two command processes could both read, both modify, and the second write would
 * discard the first. The mutex is therefore a lock FILE — it guards the critical section
 * regardless of where the data itself is stored.
 */
const LOCK_RESOURCE = join(environment.supportPath, "my-libraries");

/**
 * Reads are PURE — they never write. `getMyLibraries` is called from inside mutations, so a
 * write here would deadlock against the lock the caller already holds. Legacy entries are
 * mapped on read and only persisted when a mutation is already running.
 */
export async function getMyLibraries(): Promise<SavedLibrary[]> {
  return parseStored(await readRaw());
}

export async function isSavedLibrary(libraryId: string) {
  return (await getMyLibraries()).some((library) => library.id === libraryId);
}

/**
 * The single mutation path. `apply` runs INSIDE the lock, so read, decide, and write are one
 * indivisible step — deciding before acquiring the lock is what let two concurrent toggles
 * both observe "not saved" and both add.
 */
async function mutate(apply: (libraries: SavedLibrary[]) => SavedLibrary[]) {
  return withFileLock(LOCK_RESOURCE, async () => {
    const next = apply(parseStored(await readRaw()));
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next));

    return next;
  });
}

export async function addLibrary(library: LibrarySummary) {
  return mutate((libraries) => applyAdd(libraries, library));
}

export async function toggleLibrary(library: LibrarySummary) {
  let removed = false;

  const next = await mutate((libraries) => {
    removed = libraries.some((saved) => saved.id === library.id);

    return removed ? applyRemove(libraries, library.id) : applyAdd(libraries, library);
  });

  if (removed) {
    await removeCachedLibrary(library.id);
  }

  return next;
}

export async function clearMyLibraries() {
  const next = await mutate(() => {
    logger.log("Cleared all saved libraries");

    return [];
  });

  await LocalStorage.removeItem(LEGACY_STORAGE_KEY);
  await pruneCachedLibraries([]);

  return next;
}

function applyAdd(libraries: SavedLibrary[], library: LibrarySummary) {
  if (libraries.some((saved) => saved.id === library.id)) {
    return libraries;
  }

  const next = [...libraries, { ...library, addedAt: new Date().toISOString() }];
  logger.log("Added library", { libraryId: library.id, total: next.length });

  return next;
}

function applyRemove(libraries: SavedLibrary[], libraryId: string) {
  const next = libraries.filter((library) => library.id !== libraryId);
  logger.log("Removed library", { libraryId, total: next.length });

  return next;
}

async function readRaw() {
  return (
    (await LocalStorage.getItem<string>(STORAGE_KEY)) ?? (await LocalStorage.getItem<string>(LEGACY_STORAGE_KEY)) ?? ""
  );
}

/**
 * Entries saved before the rename carry no `addedAt`. The legacy key is never deleted by a
 * read, so downgrading does not lose the list.
 */
function parseStored(raw: string): SavedLibrary[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as SavedLibrary[];

    return Array.isArray(parsed)
      ? parsed.map((library) => ({ ...library, addedAt: library.addedAt ?? library.favoritedAt }))
      : [];
  } catch (error) {
    logger.error("Could not parse saved libraries", error);

    return [];
  }
}
