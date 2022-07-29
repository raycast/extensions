import { showHUD } from "@raycast/api";
import { GoogleSearchOpner } from "./utils/opener";
import { isNotEmpty, readtext } from "./utils/readtxt";

export default async () => {
  try {
    const text = await readtext();
    if (isNotEmpty(text)) {
      await GoogleSearchOpner(text);
      showHUD("🎉 Open Google search");
    } else {
      showHUD("❌ No text found in clipboard");
    }
  } catch (error) {
    showHUD("❌ Cannot open Google!");
  }
};
