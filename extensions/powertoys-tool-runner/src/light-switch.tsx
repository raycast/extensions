import { closeMainWindow } from "@raycast/api";
import { triggerPowerToysEvent } from "./utils/triggerEvent";

const LIGHTSWITCH_TOGGLE_EVENT = "Local\\PowerToys-LightSwitch-ToggleEvent-d8dc2f29-8c94-4ca1-8c5f-3e2b1e3c4f5a";

export default async function Command() {
  await closeMainWindow();
  await triggerPowerToysEvent(LIGHTSWITCH_TOGGLE_EVENT, "Light Switch");
  return null;
}
