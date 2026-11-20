import { closeMainWindow, getApplications, LaunchProps } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

export default async function main(props: LaunchProps<{ arguments: Arguments.Index; fallbackText?: string }>) {
  try {
    const installedApplications = await getApplications();
    const houdahspot = installedApplications.find((app) => app.name === "HoudahSpot");
    const searchTerm = props.arguments.searchTerm || props.fallbackText || "";

    if (houdahspot) {
      await closeMainWindow();
      await runAppleScript(
        `on run argv
          tell application "HoudahSpot"
            if it is not running then launch
            activate
            search (item 1 of argv)
          end tell
        end run`,
        [searchTerm],
      );
    } else {
      await showFailureToast("", { title: "HoudahSpot App is not installed" });
    }
  } catch (error) {
    await showFailureToast(error, { title: "Error :(" });
  }
}
