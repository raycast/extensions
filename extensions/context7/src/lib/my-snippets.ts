import { environment } from "@raycast/api";
import { logger } from "@chrismessina/raycast-logger";

import { compareAndSwap, createWriteQueue } from "./write-queue";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { withFileLock, writeFileAtomic } from "./atomic-file";

import type { ContextSnippet, SavedSnippet } from "./types";

/**
 * Saved snippets are content snapshots, not references — Context7 has no endpoint that
 * returns a snippet by id, so the only way to keep one is to keep its text. They live on
 * disk with the library payloads rather than in LocalStorage for the same size reason.
 */
const SNIPPETS_FILE = join(environment.supportPath, "my-snippets.json");

const enqueueWrite = createWriteQueue();

/**
 * A missing file is the normal "nothing saved yet" path. Anything else — unreadable file,
 * malformed JSON — MUST throw: returning `[]` would render as "No Saved Snippets", and the
 * next mutation would then persist that empty list over the real one.
 */
export async function getMySnippets(): Promise<SavedSnippet[]> {
  let raw: string;

  try {
    raw = await readFile(SNIPPETS_FILE, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return [];
    }

    logger.error("Could not read saved snippets", error);
    throw error;
  }

  const parsed = JSON.parse(raw) as SavedSnippet[];

  if (!Array.isArray(parsed)) {
    throw new Error("The saved snippets file is not a list.");
  }

  return parsed;
}

/**
 * `source` is Context7's `codeId`/`pageId` — a stable URL into the origin docs, and the only
 * durable identity a snippet has. Snippets without one fall back to the library + title pair.
 */
export function snippetKey(snippet: ContextSnippet, libraryId: string) {
  return snippet.source || `${libraryId}#${snippet.title}`;
}

export async function isSavedSnippet(snippet: ContextSnippet, libraryId: string) {
  const key = snippetKey(snippet, libraryId);
  const snippets = await getMySnippets();

  return snippets.some((saved) => saved.key === key);
}

export async function addSnippet(snippet: ContextSnippet, library: { id: string; name: string }) {
  return enqueueWrite(() => addUnqueued(snippet, library));
}

export async function removeSnippet(key: string) {
  return enqueueWrite(() => removeUnqueued(key));
}

/**
 * Read, decide, and write in ONE queued operation — see the same note in `my-libraries.ts`.
 * Two rapid toggles would otherwise both observe "not saved" and both add.
 */
export async function toggleSnippet(snippet: ContextSnippet, library: { id: string; name: string }) {
  return enqueueWrite(async () => {
    const key = snippetKey(snippet, library.id);
    const snippets = await getMySnippets();

    return snippets.some((saved) => saved.key === key) ? removeUnqueued(key) : addUnqueued(snippet, library);
  });
}

/** The raw file contents, used as the compare-and-swap revision marker. */
async function readRaw() {
  try {
    return await readFile(SNIPPETS_FILE, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return "";
    }

    throw error;
  }
}

function parseRaw(raw: string): SavedSnippet[] {
  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw) as SavedSnippet[];

  if (!Array.isArray(parsed)) {
    throw new Error("The saved snippets file is not a list.");
  }

  return parsed;
}

const store = { readRaw, parse: parseRaw, write: persist };

// Only ever call these from inside `enqueueWrite`; a queued wrapper called from within a
// queued operation waits on a queue that cannot drain until the caller returns.
async function addUnqueued(snippet: ContextSnippet, library: { id: string; name: string }) {
  const key = snippetKey(snippet, library.id);

  return withFileLock(SNIPPETS_FILE, () =>
    compareAndSwap({
      ...store,
      apply: (snippets) => {
        if (snippets.some((saved) => saved.key === key)) {
          return { next: snippets, result: snippets };
        }

        const next: SavedSnippet[] = [
          ...snippets,
          { ...snippet, key, libraryId: library.id, libraryName: library.name, savedAt: new Date().toISOString() },
        ];
        // `key` is in the logger's credential-key set and would print as "***".
        logger.log("Added snippet", { snippetId: key, total: next.length });

        return { next, result: next };
      },
    }),
  );
}

async function removeUnqueued(key: string) {
  return withFileLock(SNIPPETS_FILE, () =>
    compareAndSwap({
      ...store,
      apply: (snippets) => {
        const next = snippets.filter((saved) => saved.key !== key);
        logger.log("Removed snippet", { snippetId: key, total: next.length });

        return { next, result: next };
      },
    }),
  );
}

export async function clearMySnippets() {
  return enqueueWrite(async () => {
    await persist([]);
    logger.log("Cleared all saved snippets");

    return [] as SavedSnippet[];
  });
}

async function persist(snippets: SavedSnippet[]) {
  await writeFileAtomic(SNIPPETS_FILE, JSON.stringify(snippets));
}
