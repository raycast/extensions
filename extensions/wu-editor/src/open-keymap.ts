import { closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { openConfigFile } from "./wu";

export default async function Command() {
  try {
    await closeMainWindow();
    await openConfigFile("keymap.json");
  } catch (error) {
    await showFailureToast(error, { title: "Could not open Wu keymap" });
  }
}
