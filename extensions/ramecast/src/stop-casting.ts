import { showHUD } from "@raycast/api";
import { stopCast } from "./lib/stream";

export default async function Command() {
  const active = await stopCast();
  await showHUD(active ? `Stopped casting to ${active.device.name}` : "Nothing is being cast");
}
