import { Clipboard, getSelectedText, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { post, SavedArticle, ScreviError } from "./lib/screvi";

const URL_PATTERN = /https?:\/\/[^\s<>"']+/i;

/**
 * A URL copied mid-sentence drags the punctuation after it, and Screvi would
 * try to fetch `example.com,`. Trim the characters that cannot end a URL, then
 * let the parser have the final say.
 */
function cleanUrl(candidate: string): string | undefined {
  const match = candidate.match(URL_PATTERN);
  if (!match) return undefined;
  const trimmed = match[0].replace(/[.,;:!?'"]+$/, "").replace(/[)\]}]+$/, (tail, offset: number) => {
    // Keep a closing bracket that a matching opener earlier in the URL needs.
    const head = match[0].slice(0, offset);
    const opens = (head.match(/[([{]/g) ?? []).length;
    const closes = (head.match(/[)\]}]/g) ?? []).length;
    return opens > closes ? tail : "";
  });
  try {
    const url = new URL(trimmed);
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
