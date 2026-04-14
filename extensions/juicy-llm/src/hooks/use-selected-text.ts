import { Clipboard, getSelectedText, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";

async function fetchSelectedText(): Promise<string> {
  try {
    const text = await getSelectedText();
    if (text.trim()) return text.trim();
  } catch {
    // getSelectedText failed, try clipboard
  }

  const clipboardText = await Clipboard.readText();
  if (clipboardText?.trim()) return clipboardText.trim();

  await showToast({
    style: Toast.Style.Failure,
    title: "No text found",
    message: "Select text or copy to clipboard",
  });
  return "";
}

export function useSelectedText() {
  return usePromise(fetchSelectedText);
}
