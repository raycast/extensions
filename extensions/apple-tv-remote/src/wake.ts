import { showHUD } from "@raycast/api";
import { wakeDevice } from "./lib/companion-extras";
import { withConnection } from "./lib/connection";
import { showErrorToast } from "./lib/errors";

export default async function Command() {
  try {
    await withConnection((conn) => wakeDevice(conn));
    await showHUD("👋 Waking");
  } catch (error) {
    await showErrorToast(error);
  }
}
