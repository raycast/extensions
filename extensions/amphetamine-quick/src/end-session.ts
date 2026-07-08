import { showHUD } from "@raycast/api";
import { endSession, ensureInstalled } from "./lib/amphetamine";

export default async function EndSession() {
  if (!(await ensureInstalled())) return;

  try {
    await endSession();
  } catch {
    await showHUD("Couldn't end session. Check Amphetamine automation permission.");
    return;
  }
  await showHUD("Amphetamine off");
}
