import { Clipboard, getSelectedText, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { post, SavedArticle, ScreviError } from "./lib/screvi";

const URL_PATTERN = /https?:\/\/[^\s<>"']+/i;

/** Closing characters that only belong to a URL when something opened them. */
const CLOSERS: Record<string, string> = {
  ")": "(",
  "]": "[",
  "}": "{",
};

/**
 * A URL copied mid-sentence drags the punctuation after it, and Screvi would
 * try to fetch `example.com,`. Strip from the end one character at a time,
 * stopping at the first closing bracket the URL actually opened — trimming the
 * whole run at once would mangle `.../Cat_(animal)).`, which ends in one
 * bracket that belongs to the path and one that belongs to the sentence.
 */
function trimTrailing(url: string): string {
  let out = url;
  while (out.length > 0) {
    const last = out[out.length - 1];
    if (".,;:!?'\"".includes(last)) {
      out = out.slice(0, -1);
      continue;
    }
    const opener = CLOSERS[last];
    if (opener) {
      const opens = out.split(opener).length - 1;
      const closes = out.split(last).length - 1;
      if (closes > opens) {
        out = out.slice(0, -1);
        continue;
      }
    }
    break;
  }
  return out;
}

function cleanUrl(candidate: string): string | undefined {
  const match = candidate.match(URL_PATTERN);
  if (!match) return undefined;
  try {
    const url = new URL(trimTrailing(match[0]));
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Whatever you have selected wins over the clipboard: selecting a link in a
 * page and firing a hotkey is the fast path this command exists for.
 * Both are scanned for a URL rather than required to be one, so a link copied
 * with surrounding text still works.
 */
async function findUrl(): Promise<string | undefined> {
  const candidates: string[] = [];
  try {
    const selected = await getSelectedText();
    if (selected) candidates.push(selected);
  } catch {
    // Nothing selected, or the frontmost app exposes no selection.
  }
  try {
    const clipboard = await Clipboard.readText();
    if (clipboard) candidates.push(clipboard);
  } catch {
    // Clipboard access denied.
  }
  for (const candidate of candidates) {
    const url = cleanUrl(candidate);
    if (url) return url;
  }
  return undefined;
}

export default async function SaveClipboardLink() {
  const url = await findUrl();
  if (!url) {
    await showHUD("No link found in your selection or clipboard");
    return;
  }

  try {
    const { data } = await post<{ data: SavedArticle }>("/articles", { url });
    await showHUD(data.duplicate ? "Already in Screvi" : "Saved to Screvi");
  } catch (error) {
    await showFailureToast(error, {
      title:
        error instanceof ScreviError && error.status === 403
          ? "This API key has no write scope"
          : "Could not save the link",
    });
  }
}
