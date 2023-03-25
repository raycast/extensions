import { Clipboard, showHUD } from "@raycast/api";
import { saveURL } from "./api/save";

export default async function Main() {
  const url = await Clipboard.readText();
  if (!url) {
    await showHUD("❌ No URL in clipboard");
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
