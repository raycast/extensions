import { showHUD } from "@raycast/api";
import { saveURL } from "../api/save";
import handleError from "./handleError";

export async function handleSave(url: string | undefined) {
  if (!url) {
    await showHUD("❌ No URL to save");
    return;
  }

  try {
    await saveURL(url);
    await showHUD("✅ Saved to Reader");
  } catch (error) {
    handleError(error as Error);
  }
}
