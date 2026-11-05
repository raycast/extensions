import { showHUD } from "@raycast/api";
import { enable } from "./lib/session";
import { turnOnMessage } from "./lib/labels";
import { showCommandFailure } from "./lib/feedback";

export default async function main() {
  try {
    await enable(null);
    await showHUD(turnOnMessage(null));
  } catch (error) {
    await showCommandFailure(error, "Failed to enable Doorstopper");
  }
}
