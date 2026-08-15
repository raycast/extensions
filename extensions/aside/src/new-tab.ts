import { closeMainWindow, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { createTab } from "./lib/browser";

export default async function Command() {
  try {
    await createTab();
    await closeMainWindow();
    await showHUD("Opened a new Aside tab");
  } catch (error) {
    await showFailureToast(error, { title: "Failed opening a new tab" });
  }
}
