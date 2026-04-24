import { closeMainWindow, open, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { buildNewSession } from "./lib/deeplink";
import { logger } from "./lib/logger";

export default async function Command(): Promise<void> {
  try {
    const url = buildNewSession({ window: "focused" });
    logger.info("new-session-quick.open");
    await open(url);
    await closeMainWindow();
    await showHUD("Opening new Craft Agents session");
  } catch (err) {
    logger.error("new-session-quick.failed", err);
    await showFailureToast(err, { title: "Failed to open Craft Agents" });
  }
}
