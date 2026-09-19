// Cache in front of the network. The commands call this, never sources/ directly.

import { Entry } from "./model";
import { read, write } from "./cache";
import { NotFoundError, fetchEntry } from "./sources";

/** The full entry, including the rendered tree where Wiktionary has one. */
export async function loadEntry(term: string, lang = "en"): Promise<Entry> {
  const cached = read(term, lang);
  if (cached && !cached.partial) return cached;

  const entry = await fetchWithCaseFallback(term, lang, false);
  write(entry);
  return entry;
}

/**
 * The cheap entry, for the preview pane of a search list. Skips the rendered
 * tree, which is the large request, and settles for the ancestry the page states
 * in its own wikitext. Arrowing down a list of fifteen results otherwise costs
 * fifteen page loads of up to 343 KB each.
 *
 * A partial entry is still cached, and still serves the next preview; only
 * loadEntry refuses it.
 */
export async function loadPreview(term: string, lang = "en"): Promise<Entry> {
  const cached = read(term, lang);
  if (cached) return cached;

  const entry = await fetchWithCaseFallback(term, lang, true);
  write(entry);
  return entry;
}

export async function reloadEntry(term: string, lang = "en"): Promise<Entry> {
  const entry = await fetchEntry(term, { lang });
  write(entry);
  return entry;
}

/**
 * Wiktionary titles are case-sensitive and lemmas are lowercase, so a word taken
 * from the start of a sentence, or from a selection, misses on the first try.
 */
async function fetchWithCaseFallback(term: string, lang: string, skipTree: boolean): Promise<Entry> {
  try {
    return await fetchEntry(term, { lang, skipTree });
  } catch (error) {
    const lower = term.toLowerCase();
    if (error instanceof NotFoundError && lower !== term) {
      return fetchEntry(lower, { lang, skipTree });
    }
    throw error;
  }
}
