import { closeMainWindow } from "@raycast/api";
import { triggerPowerToysEvent } from "./utils/triggerEvent";

const HOSTS_EDITOR_EVENT = "Local\\Hosts-ShowHostsEvent-5a0c0aae-5ff5-40f5-95c2-20e37ed671f0";

export default async function Command() {
  await closeMainWindow();
  await triggerPowerToysEvent(HOSTS_EDITOR_EVENT, "Hosts Editor");
  return null;
}
