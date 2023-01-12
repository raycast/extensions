import { showHUD, closeMainWindow } from "@raycast/api";
import { littleArcWindow } from "./utils/utils";

export default async function Command() {
  try {
    await littleArcWindow();
    await closeMainWindow();
  } catch {
    await showHUD("Could Not Create New Little Arc Window");
  }
}
