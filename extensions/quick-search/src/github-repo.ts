import { showHUD } from "@raycast/api";
import { GithubRepoOpner } from "./utils/opener";
import { isNotEmpty, readtext } from "./utils/readtxt";

export default async () => {
  try {
    const text = await readtext();
    if (isNotEmpty(text)) {
      await GithubRepoOpner(text);
      showHUD("🎉 Open GitHub search");
    } else {
      showHUD("❌ No text found in clipboard");
    }
  } catch (error) {
    showHUD("❌ Cannot open Github!");
  }
};
