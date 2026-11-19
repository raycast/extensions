import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { stopCast } from "./lib/stream";

export default async function Command() {
  try {
    const active = await stopCast();
    await showHUD(active ? `Stopped casting to ${active.device.name}` : "Nothing is being cast");
  } catch (e) {
    await showFailureToast(e, { title: "Could not stop casting" });
  }
}
