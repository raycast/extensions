import { closeMainWindow } from "@raycast/api";
import { triggerPowerToysEvent } from "./utils/triggerEvent";

const EXTRACT_TEXT_EVENT = "Local\\PowerOCREvent-dc864e06-e1af-4ecc-9078-f98bee745e3a";

export default async function Command() {
  await closeMainWindow();
  await triggerPowerToysEvent(EXTRACT_TEXT_EVENT, "Extract Text");
  return null;
}
