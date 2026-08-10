import { showHUD } from "@raycast/api";
import { startScreensaver } from "./lib/companion-extras";
import { withConnection } from "./lib/connection";
import { showErrorToast } from "./lib/errors";

export default async function Command() {
  try {
    await withConnection((conn) => startScreensaver(conn));
    await showHUD("🌌 Screensaver");
  } catch (error) {
    await showErrorToast(error);
  }
}
