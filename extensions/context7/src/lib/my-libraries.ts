import { LocalStorage } from "@raycast/api";
import { logger } from "@chrismessina/raycast-logger";

import { compareAndSwap, createWriteQueue } from "./write-queue";

import { pruneCachedLibraries, removeCachedLibrary } from "./library-cache";
import type { LibrarySummary, SavedLibrary } from "./types";

const STORAGE_KEY = "my-libraries";
/** Written by the versions of this extension that called the feature "favorites". */
const LEGACY_STORAGE_KEY = "favorite-libraries";

const enqueueWrite = createWriteQueue();

/**
 * Reads are PURE — they never write. `getMyLibraries` is called from inside `enqueueWrite`
 * callbacks, so a write here would either deadlock against its own queue or race a concurrent
 * write from another command's process. Legacy entries are mapped on read and only persisted
 * when a mutation is already running inside the queue.
 */
export async function getMyLibraries(): Promise<SavedLibrary[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);

  if (raw) {
    return parseLibraries(raw);
  }

  return readLegacyFavorites();
}

/**
 * Entries saved before the rename carry no `addedAt`. The legacy key is never deleted, so
 * downgrading does not lose the list.
 */
async function readLegacyFavorites(): Promise<SavedLibrary[]> {
  const legacyRaw = await LocalStorage.getItem<string>(LEGACY_STORAGE_KEY);

  if (!legacyRaw) {
    return [];
  }

  return parseLibraries(legacyRaw).map((library) => ({
    ...library,
    addedAt: library.addedAt ?? library.favoritedAt,
  }));
}

function parseLibraries(raw: string): SavedLibrary[] {
  try {
    const parsed = JSON.parse(raw) as SavedLibrary[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    logger.error("Could not parse saved libraries", error);
    return [];
  }
}

export async function isSavedLibrary(libraryId: string) {
  const libraries = await getMyLibraries();
  return libraries.some((library) => library.id === libraryId);
}

export async function addLibrary(library: LibrarySummary) {
  return enqueueWrite(() => addUnqueued(library));
}

export async function removeLibrary(libraryId: string) {
  return enqueueWrite(() => removeUnqueued(libraryId));
}

/**
 * Read, decide, and write in ONE queued operation. Splitting it — checking membership in one
 * queued call and mutating in another — lets two rapid toggles both observe "not saved" and
 * both add, so the second press does nothing instead of undoing the first.
 */
export async function toggleLibrary(library: LibrarySummary) {
  return enqueueWrite(async () => {
    const libraries = await getMyLibraries();

    return libraries.some((saved) => saved.id === library.id) ? removeUnqueued(library.id) : addUnqueued(library);
  });
}

/** The raw stored value, used as the compare-and-swap revision marker. */
async function readRaw() {
  return (
    (await LocalStorage.getItem<string>(STORAGE_KEY)) ?? (await LocalStorage.getItem<string>(LEGACY_STORAGE_KEY)) ?? ""
  );
}

function parseRaw(raw: string): SavedLibrary[] {
  return raw
    ? parseLibraries(raw).map((library) => ({ ...library, addedAt: library.addedAt ?? library.favoritedAt }))
    : [];
}

const store = {
  readRaw,
  parse: parseRaw,
  write: async (next: SavedLibrary[]) => LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next)),
};

// The `*Unqueued` pair carries the actual work. They must only ever be called from inside
// `enqueueWrite` — calling one of the queued wrappers from within a queued operation would
// wait on a queue that cannot drain until the caller returns.
async function addUnqueued(library: LibrarySummary) {
  return compareAndSwap({
    ...store,
    apply: (libraries) => {
      if (libraries.some((saved) => saved.id === library.id)) {
        return { next: libraries, result: libraries };
      }

      const next = [...libraries, { ...library, addedAt: new Date().toISOString() }];
      logger.log("Added library", { libraryId: library.id, total: next.length });

      return { next, result: next };
    },
  });
}

async function removeUnqueued(libraryId: string) {
  const next = await compareAndSwap({
    ...store,
    apply: (libraries) => {
      const remaining = libraries.filter((library) => library.id !== libraryId);
      logger.log("Removed library", { libraryId, total: remaining.length });

      return { next: remaining, result: remaining };
    },
  });

  // Dropped after the manifest commits — a cache no manifest references is dead weight.
  await removeCachedLibrary(libraryId);

  return next;
}

export async function clearMyLibraries() {
  return enqueueWrite(async () => {
    await LocalStorage.removeItem(STORAGE_KEY);
    await LocalStorage.removeItem(LEGACY_STORAGE_KEY);
    await pruneCachedLibraries([]);
    logger.log("Cleared all saved libraries");

    return [] as SavedLibrary[];
  });
}
