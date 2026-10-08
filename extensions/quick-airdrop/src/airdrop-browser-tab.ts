import { BrowserExtension, environment, showHUD, showToast, Toast } from "@raycast/api";
import { airDropItems, isHttpUrl } from "./lib/airdrop";

export default async function Command() {
  if (!environment.canAccess(BrowserExtension)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Browser Extension not available",
      message: "Install Raycast's Browser Extension to use this command",
    });
    return;
  }

  let url: string | undefined;

  try {
    const tabs = await BrowserExtension.getTabs();
    const active = tabs.find((tab) => tab.active) ?? tabs[0];
    url = active?.url;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not read browser tabs",
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  if (!url) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No active browser tab found",
    });
    return;
  }

  if (!isHttpUrl(url)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot AirDrop this URL",
      message: "Only http(s) links are supported",
    });
    return;
  }

  await showHUD(`Sharing ${url} via AirDrop`);

  try {
    await airDropItems([url]);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "AirDrop failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
