import { closeMainWindow, open, showToast, Toast } from "@raycast/api";

export async function launchAnvilURL(url: string) {
  try {
    await open(url);
    await closeMainWindow({ clearRootSearch: true });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open Anvil",
      message:
        "Install Anvil, then open it once to register the anvil:// URL handler.",
    });
  }
}
