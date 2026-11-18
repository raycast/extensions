import { closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { openInWu } from "./wu";

export default async function Command() {
  try {
    await closeMainWindow();
    await openInWu([], true);
  } catch (error) {
    await showFailureToast(error, { title: "Could not open a new Wu window" });
  }
}
