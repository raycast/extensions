import { closeMainWindow } from "@raycast/api";
import { triggerPowerToysEvent } from "./utils/triggerEvent";

const KEYBOARD_MANAGER_EVENT = "Local\\PowerToysOpenNewKeyboardManagerEvent-9c1d2e3f-4b5a-6c7d-8e9f-0a1b2c3d4e5f";

export default async function Command() {
  await closeMainWindow();
  await triggerPowerToysEvent(KEYBOARD_MANAGER_EVENT, "Keyboard Manager");
  return null;
}
