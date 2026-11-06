import { showHUD } from "@raycast/api";
import { disable } from "./lib/session";
import { showCommandFailure } from "./lib/feedback";

export default async function main() {
  try {
    await disable();
    await showHUD("Doorstopper is now disabled");
  } catch (error) {
    await showCommandFailure(error, "Failed to disable Doorstopper");
  }
}
