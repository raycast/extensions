import { closeMainWindow } from "@raycast/api";
import { triggerPowerToysEvent } from "./utils/triggerEvent";

const SHORTCUT_GUIDE_EVENT = "Local\\ShortcutGuide-TriggerEvent-d4275ad3-2531-4d19-9252-c0becbd9b496";

export default async function Command() {
  await closeMainWindow();
  await triggerPowerToysEvent(SHORTCUT_GUIDE_EVENT, "Shortcut Guide");
  return null;
}
