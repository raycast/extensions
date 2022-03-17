import { showHUD } from "@raycast/api";
import { DeeplOpner } from "./utils/opener";
import { isNotEmpty, readtext } from "./utils/readtxt";

export default async () => {
  try {
    const text = await readtext();
    if (isNotEmpty(text)) {
      await DeeplOpner(text);
      showHUD("🎉 Open Deepl search");
    } else {
      showHUD("❌ No text found in clipboard");
    }
  } catch (error) {
    showHUD("❌ Cannot open Deepl!");
  }
};
