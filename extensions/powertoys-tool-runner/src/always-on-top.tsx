import { closeMainWindow } from "@raycast/api";
import { triggerPowerToysEvent } from "./utils/triggerEvent";

const ALWAYS_ON_TOP_EVENT = "Local\\AlwaysOnTopPinEvent-892e0aa2-cfa8-4cc4-b196-ddeb32314ce8";

export default async function Command() {
  await closeMainWindow();
  await triggerPowerToysEvent(ALWAYS_ON_TOP_EVENT, "Always on Top");
  return null;
}
