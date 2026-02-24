import {
  showHUD,
  showToast,
  Toast,
  closeMainWindow,
  environment,
} from "@raycast/api";
import { getGroupBySlot } from "./utils/storage";
import { raiseWindow } from "./utils/native";

export default async function Command() {
  const match = environment.commandName.match(/(\d+)$/);
  const slot = match ? parseInt(match[1], 10) : 0;

  if (slot < 1 || slot > 5) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid slot number",
    });
    return;
  }

  const group = getGroupBySlot(slot);
  if (!group) {
    await showToast({
      style: Toast.Style.Failure,
      title: `No group assigned to Slot ${slot}`,
    });
    return;
  }

  try {
    for (const win of group.windows) {
      raiseWindow(win.bundleId, win.titleMatch, win.windowId);
    }
    await closeMainWindow({ clearRootSearch: true });
    await showHUD(`Summoned "${group.name}"`);
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Summon Failed",
      message: String(err),
    });
  }
}
