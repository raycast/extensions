import { closeMainWindow, showHUD } from "@raycast/api";
import { openUrlInHelium } from "./utils/applescript";

export default async function Command() {
  try {
    await openUrlInHelium("chrome://new-tab-page/");
    await closeMainWindow();
  } catch (error) {
    await showHUD("Failed opening a new Helium tab");
    console.error("Error opening new tab:", error);
  }
}
