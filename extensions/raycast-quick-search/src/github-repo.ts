import { showHUD } from "@raycast/api";
import { GithubRepoOpner } from "./utils/opener";
import { isNotEmpty, readtext } from "./utils/readtxt";

export default async () => {
  try {
    const text = await readtext();
    if (isNotEmpty(text)) {
      await GithubRepoOpner(text);
      showHUD("🎉 Open github search");
    } else {
      showHUD("👀 Can not found target text");
    }
  } catch (error) {
    showHUD("💩 Sorry, Can not open github for now!");
  }
};
