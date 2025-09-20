import { BrowserExtension, Clipboard, getSelectedText } from "@raycast/api";
import { getErrorMessage } from "./error";

export async function fetchContent(source: "clipboard" | "selectedText" | "browserTab") {
  let content: string | null = null;
  let error: string | null = null;

  if (source === "clipboard") {
    content = (await Clipboard.readText()) || null;
  } else if (source === "selectedText") {
    // This is a workaround to get the actual selected text;
    // otherwise, it can return the previously selected text.
    for (let i = 0; i < 7; i++) {
      try {
        content = await getSelectedText();
      } catch (err) {
        error = getErrorMessage(err, "No text selected. Ensure that the required application is in focus.");
      }
      if (content !== null) {
        error = null;
      }
    }
  } else {
    try {
      content = await BrowserExtension.getContent({ format: "markdown" });
    } catch (err) {
      const defaultMsg =
        "Could not connect to the Browser Extension. Make sure a Browser Tab is focused and the Raycast browser extension is installed.";
      error = getErrorMessage(err, defaultMsg);
      if (error.startsWith("Could not connect to the Browser Extension.")) {
        // Replace the default message with a more detailed message.
        error = defaultMsg;
      } else if (error.startsWith("Could not get the content of the tab")) {
        error =
          "Could not get the content of the tab. Please check that the Raycast browser extension is installed and enabled. If everything is correct, try reopening the web browser.";
      }
    }
  }

  return { content, error };
}
