import { Clipboard, showToast, Toast } from "@raycast/api";

export default async function Command() {
  try {
    // Get text from clipboard
    const clipboardText = await Clipboard.readText();

    if (!clipboardText) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text in clipboard",
        message: "Please copy some text to clipboard first",
      });
      return;
    }

    // Escape the string (JavaScript/JSON style escaping)
    const escapedString = clipboardText
      .replace(/\\/g, "\\\\") // Escape backslashes first
      .replace(/"/g, '\\"') // Escape double quotes
      .replace(/'/g, "\\'") // Escape single quotes
      .replace(/\n/g, "\\n") // Escape newlines
      .replace(/\r/g, "\\r") // Escape carriage returns
      .replace(/\t/g, "\\t") // Escape tabs
      .replace(/\b/g, "\\b") // Escape backspace
      .replace(/\f/g, "\\f") // Escape form feed
      .replace(/\v/g, "\\v"); // Escape vertical tab

    // Copy escaped string back to clipboard
    await Clipboard.copy(escapedString);

    await showToast({
      style: Toast.Style.Success,
      title: "String Escaped",
      message: "Escaped string copied to clipboard",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: "Failed to escape string",
    });
  }
}
