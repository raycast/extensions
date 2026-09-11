import { closeMainWindow } from "@raycast/api";
import { triggerPowerToysEvent } from "./utils/triggerEvent";

const WORKSPACES_EVENT = "Local\\Workspaces-LaunchEditorEvent-a55ff427-cf62-4994-a2cd-9f72139296bf";

export default async function Command() {
  await closeMainWindow();
  await triggerPowerToysEvent(WORKSPACES_EVENT, "Workspaces");
  return null;
}
