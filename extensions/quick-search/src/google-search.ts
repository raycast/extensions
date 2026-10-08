import { LaunchProps, showHUD } from "@raycast/api";
import { GoogleSearchOpner } from "./utils/opener";
import { isNotEmpty, readtext } from "./utils/readtxt";

export default async (props: LaunchProps) => {
  const fallbackText = props.fallbackText;
  try {
    const text = await readtext(fallbackText);
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
