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
 * Replaces all line breaks in a string with a single space.
 * @param str - The string to process.
 * @returns The processed string with line breaks replaced by spaces.
 */
const replaceLineBreaks = (str: string): string => {
  return str.replace(/(\r\n|\n|\r)/gm, " ").trim();
};

/**
 * Gets the text content from the clipboard and replaces line breaks with spaces.
 * @returns The processed clipboard text content or an empty string if unavailable.
 */
const getClipboardText = async (): Promise<string> => {
  try {
    const content = await Clipboard.readText();
    return content ? replaceLineBreaks(content) : "";
  } catch (error) {
    console.error("Error reading clipboard:", error);
    return "";
  }
};

/**
 * Gets selected text if available, otherwise falls back to clipboard text.
 * Replaces any line breaks with spaces in the result.
 * @returns Processed selected text, clipboard text, or an empty string.
 */
export const fetchItemInput = async (): Promise<string> => {
  try {
    const selectedText = await getSelectedText();
    if (!isEmpty(selectedText)) {
      return replaceLineBreaks(selectedText);
    }
  } catch (error) {
    // Silently catch the error and proceed to clipboard
  }

  // If no selected text or error occurred, try clipboard
  return getClipboardText();
};

export { isEmpty };
