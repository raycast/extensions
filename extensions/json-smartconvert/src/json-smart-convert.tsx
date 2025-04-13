import { showToast, Toast, Clipboard } from "@raycast/api";

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
      result = JSON.stringify(JSON.parse(clipboardText));
      await showToast({ style: Toast.Style.Success, title: "Parsed JSON" });
    }
    await Clipboard.copy(result);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid JSON format",
    });
    return;
  }
}
