import { showHUD } from "@raycast/api";
import { openNewWindow } from "./utils";

export default async function Command() {
  try {
    await openNewWindow();
  } catch {
    await showHUD("❌ Failed opening a new window");
  }
}
