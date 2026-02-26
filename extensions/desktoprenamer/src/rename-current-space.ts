import { LaunchProps, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { escapeAppleScriptString } from "./utils";

export default async function Command(props: LaunchProps<{ arguments: Arguments.RenameCurrentSpace }>) {
  const { newName } = props.arguments;

  try {
    const sanitizedName = escapeAppleScriptString(newName).replace(/~/g, "");

    await runAppleScript(`tell application "DesktopRenamer" to rename current space "${sanitizedName}"`);

    await showHUD(`Renamed space to "${sanitizedName}"`);
  } catch {
    await showHUD("Failed to rename space. Is DesktopRenamer running?");
  }
}
