import { open, showHUD } from "@raycast/api";
import { getUnifiControllerUrlPreference } from "./lib/unifi";
import { showErrorToast } from "./utils";

export default async function Main() {
  try {
    const url = getUnifiControllerUrlPreference();
    await open(url);
    await showHUD("Open Unifi Dashboard in Browser");
  } catch (error) {
    showErrorToast(error as Error);
  }
}
