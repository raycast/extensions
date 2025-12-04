import { closeMainWindow, showHUD } from "@raycast/api";
import { getActiveTabURL, createNewGuestWindowToWebsite } from "./actions";

export default async function Command() {
  try {
    await closeMainWindow();

    const url = await getActiveTabURL();
    if (!url || url === "") {
      await showHUD("No active tab URL found to open in guest window");
      return;
    }

    await createNewGuestWindowToWebsite(url);
  } catch {
    await showHUD("❌ Failed opening current tab in Guest window");
  }
}
