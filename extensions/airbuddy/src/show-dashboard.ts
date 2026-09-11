import { closeMainWindow, showHUD } from "@raycast/api";
import { showDashboard } from "./airbuddy";
import { showFailure } from "./feedback";

export default async function Command() {
  try {
    await closeMainWindow();
    await showDashboard();
    await showHUD("AirBuddy Dashboard");
  } catch (error) {
    await showFailure("Couldn't open the AirBuddy dashboard", error);
  }
}
