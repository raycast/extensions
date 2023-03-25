import { getSelectedText, showHUD } from "@raycast/api";
import { saveURL } from "./api/save";

export default async function Main() {
  const url = await getSelectedText();
  try {
    await saveURL(url);
    await showHUD("✅ Saved to Reader");
  } catch (error) {
    await showHUD(`❌ ${(error as Error).message}`);
    return;
  }
}
