import { LaunchProps, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function Command(props: LaunchProps<{ arguments: Arguments.RenameCurrentSpace }>) {
  const { newName } = props.arguments;

  try {
    const sanitizedName = newName.replace(/"/g, '\\"');

    await runAppleScript(`tell application "DesktopRenamer" to rename current space "${sanitizedName}"`);

    await showHUD(`Renamed space to "${newName}"`);
  } catch {
    await showHUD("Failed to rename space. Is DesktopRenamer running?");
  }
}
