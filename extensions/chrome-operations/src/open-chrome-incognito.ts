import { showHUD } from "@raycast/api";
import { openChromeIncognito } from "./utils/browser-helpers";

export default async function main() {
  try {
    await openChromeIncognito();
    await showHUD("Opening Chrome in Incognito mode");
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("Google Chrome not found")) {
        await showHUD("Google Chrome not installed");
      } else {
        await showHUD(`Error: ${error.message}`);
      }
    } else {
      await showHUD("Failed to open Chrome Incognito");
    }
  }
}
