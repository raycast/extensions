import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { openCodexApp } from "./utils/codex-launch";

export default async function Command() {
  try {
    await openCodexApp();
    await showHUD("Opened Codex.");
  } catch (error) {
    await showFailureToast(error, { title: "Unable to open Codex" });
  }
}
