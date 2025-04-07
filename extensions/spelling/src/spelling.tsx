import "react";
import { getSelectedText, Clipboard, showToast, Toast } from "@raycast/api";
import { fixSpelling } from "./ai";
import { showFailureToast } from "@raycast/utils";

export default async function () {
  try {
    await showToast(Toast.Style.Animated, "Processing", "Processing text");
    const text = await getSelectedText();
    const fixed = await fixSpelling(text);
    await Clipboard.paste(fixed);
    await showToast(Toast.Style.Success, "Success", "Text was corrected");
  } catch (error) {
    await showFailureToast(error, { title: "Failed to process text" });
  }
}
