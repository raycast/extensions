import { LaunchProps, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

interface RenameArguments {
  newName: string;
}

export default async function Command(props: LaunchProps<{ arguments: RenameArguments }>) {
  const { newName } = props.arguments;

  try {
    const sanitizedName = newName.replace(/"/g, '\\"');

    await runAppleScript(`tell application "DesktopRenamer" to rename current space "${sanitizedName}"`);

    await showHUD(`Renamed space to "${newName}"`);
  } catch {
    await showHUD("Failed to rename space. Is DesktopRenamer running?");
  }
}
