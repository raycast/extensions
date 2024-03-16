import { closeMainWindow, showHUD } from "@raycast/api";
import { makeNewTab } from "./arc";

const url = "https://arc.net/boosts";

export default async function command() {
  try {
    await closeMainWindow();
    await makeNewTab(url);
  } catch {
    await showHUD("❌ Failed opening Arc Boost Gallery");
  }
}
