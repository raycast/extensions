import { LaunchProps, showHUD } from "@raycast/api";
import { DeeplOpner } from "./utils/opener";
import { isNotEmpty, readtext } from "./utils/readtxt";

export default async (props: LaunchProps) => {
  const fallbackText = props.fallbackText;
  try {
    const text = await readtext(fallbackText);
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
