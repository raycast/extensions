import { closeMainWindow, showHUD } from "@raycast/api";
import { makeNewTab } from "./arc";

const url = "https://resources.arc.net/en/articles/8233343-release-notes";

export default async function command() {
  try {
    await closeMainWindow();
    await makeNewTab(url);
  } catch {
    await showHUD("❌ Failed opening Arc Release Notes");
  }
}
