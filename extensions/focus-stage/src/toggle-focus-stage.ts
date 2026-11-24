import { closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { prepareToggle, toggleStage } from "swift:../swift";
import { isRaycastWindow, refreshMenuBar, settingsFromPreferences, stateDirectory, TargetHint } from "./lib/stage";

export default async function Command() {
  try {
    const settings = JSON.stringify(settingsFromPreferences());
    const context = await prepareToggle(stateDirectory);

    if (context.active) {
      await closeMainWindow();
      await toggleStage(stateDirectory, settings, "");
    } else {
      // The window to focus is captured before Raycast steps aside. Raycast's window is closed
      // first, except when the stage is for a Raycast window that had focus itself (the AI Chat):
      // closing would hand focus to the previous app. From the search bar, the captured window is
      // the one behind it (which can be the AI Chat), and the bar is closed.
      const target = (context.target ?? undefined) as TargetHint | undefined;
      if (!isRaycastWindow(target) || target?.viaLauncher) await closeMainWindow();

      const status = await toggleStage(stateDirectory, settings, target ? JSON.stringify(target) : "");
      // busy: a start or end was still running (fast double press), so this press was ignored.
      if (!status.active && !status.busy) {
        await showFailureToast(status.message ?? "Unknown error", { title: "Focus Stage didn't start" });
      }
    }
  } catch (error) {
    await showFailureToast(error, { title: "Focus Stage failed" });
  }
  await refreshMenuBar();
}
