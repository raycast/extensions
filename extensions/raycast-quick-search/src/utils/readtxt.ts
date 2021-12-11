import { getSelectedText } from "@raycast/api";
import { runAppleScript } from "run-applescript"

const isNotEmpty = (string: string | null | undefined) => {
  return string != null && String(string).length > 0
}

/**
  * 1. Get the selected text in the current document.
  * 2. If there is no selected text, get the text in the current clipboard.
  * 3. If there is no text in the clipboard, return empty.
  */
export const readtext = async () => {
  try {
      const selectedText = await getSelectedText();
      if (isNotEmpty(selectedText)) return selectedText;
      const clipboard = await runAppleScript('the clipboard')
      if (isNotEmpty(clipboard)) return clipboard
      return ""
  } catch {
    return ""
  }
}
