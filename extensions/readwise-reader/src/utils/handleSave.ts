import { showHUD } from "@raycast/api";
import { saveURL } from "../api/save";

export async function handleSave(url: string | undefined) {
  if (!url) {
    await showHUD("❌ No URL to save");
    return;
  }

  try {
    await saveURL(url);
    await showHUD("✅ Saved to Reader");
  } catch (error) {
    await showHUD(`❌ ${(error as Error).message}`);
    return;
  }
}
