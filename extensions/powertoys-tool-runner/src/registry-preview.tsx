import { closeMainWindow } from "@raycast/api";
import { triggerPowerToysEvent } from "./utils/triggerEvent";

const REGISTRY_PREVIEW_EVENT = "Local\\RegistryPreviewEvent-4C559468-F75A-4E7F-BC4F-9C9688316687";

export default async function Command() {
  await closeMainWindow();
  await triggerPowerToysEvent(REGISTRY_PREVIEW_EVENT, "Registry Preview");
  return null;
}
