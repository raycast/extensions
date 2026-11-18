import { closeMainWindow } from "@raycast/api";
import { triggerPowerToysEvent } from "./utils/triggerEvent";

const MEASURE_TOOL_EVENT = "Local\\MeasureToolEvent-3d46745f-09b3-4671-a577-236be7abd199";

export default async function Command() {
  await closeMainWindow();
  await triggerPowerToysEvent(MEASURE_TOOL_EVENT, "Measure Tool");
  return null;
}
