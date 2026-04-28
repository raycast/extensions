import { showHUD } from "@raycast/api";
import { sendGatherKeystroke } from "./utils";

// AFK macro: toggle mic+camera (⌘⇧D) then set status to Away (⌘U).
// Note: ⌘⇧D is a toggle in V2 — running this twice un-mutes mic and camera while keeping status Away.
export default async function Command() {
  if (!(await sendGatherKeystroke("d", ["shift down", "command down"]))) return;
  await sendGatherKeystroke("u", ["command down"]);
  await showHUD("Away from keyboard");
}
