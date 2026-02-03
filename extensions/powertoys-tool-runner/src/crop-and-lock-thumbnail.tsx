import { closeMainWindow } from "@raycast/api";
import { triggerPowerToysEvent } from "./utils/triggerEvent";

const CROP_AND_LOCK_THUMBNAIL_EVENT = "Local\\PowerToysCropAndLockThumbnailEvent-1637be50-da72-46b2-9220-b32b206b2434";

export default async function Command() {
  await closeMainWindow();
  await triggerPowerToysEvent(CROP_AND_LOCK_THUMBNAIL_EVENT, "Crop and Lock - Thumbnail");
  return null;
}
