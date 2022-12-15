import { showHUD } from "@raycast/api";
import { createNewArcWindow } from "./utils";

export default async function Command() {
  try {
    await createNewArcWindow();
  } catch {
    await showHUD("❌ Couldn't create window");
  }
}
