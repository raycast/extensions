import { closeMainWindow, showHUD } from "@raycast/api";
import { makeNewWindow } from "./arc";

export default async function command() {
  try {
    await closeMainWindow();
    await makeNewWindow({ incognito: true });
  } catch {
    await showHUD("❌ Failed opening a new incogntio window");
  }
}
