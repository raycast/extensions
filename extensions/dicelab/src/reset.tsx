// Reset Context command - clears all aliases and history

import { showToast, Toast } from "@raycast/api";
import { resetEngine } from "./engine";
import { resetAll } from "./engine/storage";

export default async function ResetCommand() {
  try {
    await resetEngine();
    await resetAll();
    await showToast({
      style: Toast.Style.Success,
      title: "Context Reset",
      message: "All aliases and history cleared",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Reset Failed",
      message:
        error instanceof Error ? error.message : "Failed to reset context",
    });
  }
}
