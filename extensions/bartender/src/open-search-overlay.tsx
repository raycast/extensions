import { closeMainWindow } from "@raycast/api";
import { performOpenSearchOverlay } from "./api";
import { runWithErrorToast } from "./utils";

export default async function Command() {
  await closeMainWindow();
  await runWithErrorToast(performOpenSearchOverlay, "Failed to open Bartender search overlay");
}
