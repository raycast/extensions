import { environment } from "@raycast/api";
import { logger } from "@chrismessina/raycast-logger";
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

/**
 * The single mutation path. `apply` runs INSIDE the lock, so read, decide, and write are one
 * indivisible step. Every mutator goes through here — a bypass (as `clearMySnippets` once
 * was) can discard a concurrent write no matter how careful the others are.
 */
async function mutate(apply: (snippets: SavedSnippet[]) => SavedSnippet[]) {
  return withFileLock(SNIPPETS_FILE, async () => {
    const next = apply(await getMySnippets());
    await writeFileAtomic(SNIPPETS_FILE, JSON.stringify(next));

    return next;
  });
}

export async function addSnippet(snippet: ContextSnippet, library: { id: string; name: string }) {
  return mutate((snippets) => applyAdd(snippets, snippet, library));
}

export async function removeSnippet(key: string) {
  return mutate((snippets) => applyRemove(snippets, key));
}

export async function clearMySnippets() {
  return mutate(() => {
    logger.log("Cleared all saved snippets");

    return [];
  });
}

function applyAdd(snippets: SavedSnippet[], snippet: ContextSnippet, library: { id: string; name: string }) {
  const key = snippetKey(snippet, library.id);

  if (snippets.some((saved) => saved.key === key)) {
    return snippets;
  }

  const next: SavedSnippet[] = [
    ...snippets,
    { ...snippet, key, libraryId: library.id, libraryName: library.name, savedAt: new Date().toISOString() },
  ];
  // `key` is in the logger's credential-key set and would print as "***".
  logger.log("Added snippet", { snippetId: key, total: next.length });

  return next;
}

function applyRemove(snippets: SavedSnippet[], key: string) {
  const next = snippets.filter((saved) => saved.key !== key);
  logger.log("Removed snippet", { snippetId: key, total: next.length });

  return next;
}
