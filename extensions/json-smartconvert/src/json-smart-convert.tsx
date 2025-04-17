import { showToast, Toast, Clipboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default async function Command() {
  const clipboardText = await Clipboard.readText();
  if (!clipboardText?.trim()) {
    await showToast({ style: Toast.Style.Failure, title: "Clipboard is empty" });
    return;
  }
  let result: string;
  try {
    if (clipboardText.startsWith("{") || clipboardText.startsWith("[")) {
      result = JSON.stringify(clipboardText, null, 2);
      await showToast({ style: Toast.Style.Success, title: "Stringified JSON" });
    } else {
      result = JSON.parse(clipboardText);
      await showToast({ style: Toast.Style.Success, title: "Parsed JSON" });
    }
    await Clipboard.copy(result);
  } catch (error) {
    showFailureToast({
      title: "Error",
      message: "Failed to parse or stringify JSON",
      error,
    });
    return;
  }
}
