import { showHUD } from "@raycast/api";
import { getActiveBrowserUrl, openInChrome } from "./utils/browser-helpers";

export default async function main() {
  try {
    const url = await getActiveBrowserUrl();

    if (!url) {
      await showHUD("No supported browser active or no page loaded");
      return;
    }

    await openInChrome(url);
    await showHUD(`Opening ${url} in Chrome`);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("Google Chrome not found")) {
        await showHUD("Google Chrome not installed");
      } else {
        await showHUD(`Error: ${error.message}`);
      }
    } else {
      await showHUD("Failed to open in Chrome");
    }
  }
}
