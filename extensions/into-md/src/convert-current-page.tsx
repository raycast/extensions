import {
  Clipboard,
  showHUD,
  showToast,
  Toast,
  BrowserExtension,
} from "@raycast/api";
import { fetchMarkdown } from "./utils";

export default async function Command() {
  try {
    // Get active browser tab
    const tabs = await BrowserExtension.getTabs();
    const activeTab = tabs.find((tab) => tab.active);

    if (!activeTab?.url) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No active browser tab found",
      });
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: "Converting to markdown...",
    });

    // Fetch markdown from into.md
    const markdown = await fetchMarkdown(activeTab.url);

    // Wrap in XML structure
    const output = `<site>
<url>${activeTab.url}</url>
<content>
${markdown}
</content>
</site>`;

    // Copy to clipboard
    await Clipboard.copy(output);

    await showHUD("Markdown copied to clipboard");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("Browser Extension")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Browser Extension required",
        message: "Install Raycast Browser Extension",
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Conversion failed",
        message: message,
      });
    }
  }
}
