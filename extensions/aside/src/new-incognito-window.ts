import { closeMainWindow, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { createWindow } from "./lib/browser";

export default async function Command() {
  try {
    await createWindow("incognito");
    await closeMainWindow();
    await showHUD("Opened a new incognito window");
  } catch (error) {
    await showFailureToast(error, { title: "Failed opening an incognito window" });
  }
}
