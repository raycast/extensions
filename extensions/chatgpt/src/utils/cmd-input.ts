import { BrowserExtension, Clipboard, getSelectedText } from "@raycast/api";
import { getErrorMessage } from "./error";

export async function fetchContent(source: "clipboard" | "selectedText" | "browserTab") {
  let content: string | null = null;
  let error: string | null = null;

  if (source === "clipboard") {
    try {
      content = (await Clipboard.readText()) || null;
      if (!content?.trim()) error = "Copy some text to the clipboard, then run this AI command again.";
    } catch (err) {
      error = getErrorMessage(err, "Could not read text from the clipboard.");
    }
  } else if (source === "selectedText") {
    try {
      content = await getSelectedText();
    } catch {
      // Raycast rejects the selection request when the frontmost app has no selected text.
    }
    if (!content?.trim()) error = "Select the text you want to use, then run this command again.";
  } else {
    try {
      content = await BrowserExtension.getContent({ format: "markdown" });
      if (!content?.trim()) error = "There is no readable text on the active page.";
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
