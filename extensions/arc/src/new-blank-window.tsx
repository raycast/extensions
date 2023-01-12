import { showHUD, closeMainWindow } from "@raycast/api";
import { blackWindow } from "./utils/utils";

export default async function Command() {
  try {
    await blackWindow();
    await closeMainWindow();
  } catch {
    await showHUD("Could Not Create New Black Window");
  }
}
