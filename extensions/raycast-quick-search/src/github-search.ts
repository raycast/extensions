import { showHUD } from "@raycast/api";
import { GithubSearchOpner } from "./utils/opener";
import { isNotEmpty, readtext } from "./utils/readtxt";

export default async () => {
  try {
    const text = await readtext();
    if (isNotEmpty(text)) {
      await GithubSearchOpner(text);
      showHUD("🎉 Open GitHub search");
    } else {
      showHUD("❌ No text found in clipboard");
    }
  } catch (error) {
    showHUD("💩 Sorry, Can not open GitHub for now!");
  }
};
