import { closeMainWindow } from "@raycast/api";
import { triggerPowerToysEvent } from "./utils/triggerEvent";

const CROP_AND_LOCK_REPARENT_EVENT = "Local\\PowerToysCropAndLockReparentEvent-6060860a-76a1-44e8-8d0e-6355785e9c36";

export default async function Command() {
  await closeMainWindow();
  await triggerPowerToysEvent(CROP_AND_LOCK_REPARENT_EVENT, "Crop and Lock - Reparent");
  return null;
}
