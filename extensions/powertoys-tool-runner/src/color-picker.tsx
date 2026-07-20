import { closeMainWindow } from "@raycast/api";
import { triggerPowerToysEvent } from "./utils/triggerEvent";

const SHOW_COLOR_PICKER_EVENT = "Local\\ShowColorPickerEvent-8c46be2a-3e05-4186-b56b-4ae986ef2525";

export default async function Command() {
  await closeMainWindow();
  await triggerPowerToysEvent(SHOW_COLOR_PICKER_EVENT, "Color Picker");
  return null;
}
