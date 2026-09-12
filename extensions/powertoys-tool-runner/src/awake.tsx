import { closeMainWindow } from "@raycast/api";
import { openPowerToysSettings } from "./utils/openSettings";

export default async function Command() {
  await closeMainWindow();
  await openPowerToysSettings("Awake");
  return null;
}
