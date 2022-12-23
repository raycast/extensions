import { showHUD } from "@raycast/api";
import { createNewArcWindow } from "./utils/utils";

export default async function Command() {
  try {
    await createNewArcWindow();
  } catch {
    await showHUD("Could Not Create a New Arc Window");
  }
}
