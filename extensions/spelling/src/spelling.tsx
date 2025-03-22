import "react";
import { getSelectedText, Clipboard, showToast, Toast } from "@raycast/api";
import { fixSpelling } from "./ai";

export default async function () {
  await showToast(Toast.Style.Animated, "Processing", "Processing text");
  const text = await getSelectedText();
  const fixed = await fixSpelling(text);
  await Clipboard.paste(fixed);
  await showToast(Toast.Style.Success, "Success", "Text was corrected");
}
