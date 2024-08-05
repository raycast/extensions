import { Clipboard, getSelectedText } from "@raycast/api";

/**
 * Checks if a string is empty or null/undefined.
 * @param str - The string to check.
 * @returns True if the string is empty, null, or undefined; false otherwise.
 */
const isEmpty = (str: string | null | undefined): boolean => {
  return !str || str.trim().length === 0;
};

/**
 * Gets the text content from the clipboard.
 * @returns The clipboard text content or an empty string if unavailable.
 */
const getClipboardText = async (): Promise<string> => {
  try {
    const content = await Clipboard.readText();
    return content ?? "";
  } catch (error) {
    console.error("Error reading clipboard:", error);
    return "";
  }
};

/**
 * Gets selected text if available, otherwise falls back to clipboard text.
 * @returns Selected text, clipboard text, or an empty string.
 */
export const fetchItemInput = async (): Promise<string> => {
  try {
    const selectedText = await getSelectedText();
    if (!isEmpty(selectedText)) {
      return selectedText;
    }
  } catch (error) {
    // Silently catch the error and proceed to clipboard
  }

  // If no selected text or error occurred, try clipboard
  const clipboardText = await getClipboardText();
  return clipboardText;
};

export { isEmpty };
