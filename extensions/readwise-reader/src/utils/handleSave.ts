import { showHUD } from "@raycast/api";
import { saveURL, saveURLs } from "../api/save";
import handleError from "./handleError";

export async function handleSave(url: string | undefined, author?: string, tags?: string) {
  if (!url) {
    await showHUD("❌ No URL to save");
    return;
  }

  try {
    await saveURL(url, author, tags);
    await showHUD("✅ Saved to Reader");
  } catch (error) {
    handleError(error as Error);
  }
}

export async function handleSaveURLs(urls: string | undefined, author?: string, tags?: string) {
  if (!urls) {
    await showHUD("❌ No URLs to save");
    return;
  }

  try {
    await saveURLs(urls, author, tags);
    await showHUD("✅ Saved to Reader");
  } catch (error) {
    handleError(error as Error);
  }
}
