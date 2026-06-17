import { LaunchProps, showHUD } from "@raycast/api";
import { GithubRepoOpner } from "./utils/opener";
import { isNotEmpty, readtext } from "./utils/readtxt";

export default async (props: LaunchProps) => {
  const fallbackText = props.fallbackText;
  try {
    const text = await readtext(fallbackText);
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
