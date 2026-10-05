import { closeMainWindow } from "@raycast/api";
import { triggerPowerToysEvent } from "./utils/triggerEvent";

const FANCY_ZONES_EVENT = "Local\\FancyZones-ToggleEditorEvent-1e174338-06a3-472b-874d-073b21c62f14";

export default async function Command() {
  await closeMainWindow();
  await triggerPowerToysEvent(FANCY_ZONES_EVENT, "Fancy Zones Editor");
  return null;
}
