import { showHUD } from "@raycast/api";
import { getActiveSession, stopActiveSession } from "./lib/storage";
import { tick } from "./lib/tracker";
import { refreshMenuBar } from "./lib/menubar";

export default async function Command() {
  const active = await getActiveSession();
  if (!active) {
    await showHUD("No active Spacetime session");
    return;
  }
  await tick(); // flush final delta
  const savedPath = await stopActiveSession();
  await refreshMenuBar();
  await showHUD(savedPath ? `Stopped “${active.name}” — saved to ${savedPath}` : `Stopped “${active.name}”`);
}
