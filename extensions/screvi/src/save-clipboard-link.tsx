import { Clipboard, getSelectedText, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { post, SavedArticle, ScreviError } from "./lib/screvi";

const URL_PATTERN = /https?:\/\/[^\s<>"')]+/i;

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
    const match = candidate.match(URL_PATTERN);
    if (match) return match[0];
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
