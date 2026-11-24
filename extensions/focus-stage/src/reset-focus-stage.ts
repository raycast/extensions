import { closeMainWindow, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { resetStage } from "swift:../swift";
import { refreshMenuBar, stateDirectory } from "./lib/stage";

/** Puts everything back when a stage looks wrong or won't turn off. */
export default async function Command() {
  await closeMainWindow();
  try {
    const result = await resetStage(stateDirectory);
    if (result.incomplete) {
      await showFailureToast(
        "System Events didn't respond. Check that Raycast may control System Events in Privacy & Security → Automation, then run Reset Focus Stage again.",
        {
          title: "Menu bar or Dock not restored",
        },
      );
    } else {
      const restored = result.restored.length > 0 ? ` · restored ${result.restored.join(", ")}` : "";
      await showHUD(result.stoppedProcesses > 0 || restored ? `Focus Stage reset${restored}` : "Nothing to reset");
    }
  } catch (error) {
    await showFailureToast(error, { title: "Could not reset Focus Stage" });
  }
  await refreshMenuBar();
}
