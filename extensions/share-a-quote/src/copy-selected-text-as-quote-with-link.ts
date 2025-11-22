import { getSelectedText, Clipboard, showHUD, BrowserExtension } from "@raycast/api";

// Function to get current browser URL
async function getCurrentBrowserURL(): Promise<string | undefined> {
  try {
    const tabs = await BrowserExtension.getTabs();
    const activeTab = tabs.find((tab) => tab.active);
    return activeTab?.url;
  } catch (error) {
    await showHUD("Browser extension not available. " + error);
    return undefined;
  }
}

// Format text as a quote with special formatting
function formatAsQuoteAndLink(text: string, url: string): string {
  return `> "${text}"\n\n${url}`;
}

export default async function Command() {
  try {
    const selectedText = await getSelectedText();
    if (!selectedText || selectedText.trim().length === 0) {
      const message = "No text selected";
      await showHUD(message);
      throw new Error(message);
    }

    const currentURL = await getCurrentBrowserURL();
    if (!currentURL) {
      const message = "No URL found in browser";
      await showHUD(message);
      throw new Error(message);
    }

    // Format the text as a beautiful quote with URL
    const formattedText = formatAsQuoteAndLink(selectedText, currentURL);
    await Clipboard.copy(formattedText);

    // Show success HUD (automatically closes main window)
    await showHUD("Formatted Text Copied!");
  } catch (error) {
    // Handle error when no text is selected or other issues occur
    const errorMessage = error instanceof Error ? error.message : "No text selected or unable to access selected text";
    await showHUD(`Cannot copy text: ${errorMessage}`);
  }
}
