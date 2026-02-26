import { LaunchProps, showHUD } from "@raycast/api";
import { escapeAppleScriptString, runDesktopRenamerCommand } from "./utils";

export default async function Command(props: LaunchProps<{ arguments: Arguments.RenameCurrentSpace }>) {
  const { newName } = props.arguments;

  try {
    const sanitizedName = escapeAppleScriptString(newName).replace(/~/g, "");
    await runDesktopRenamerCommand(`rename current space "${sanitizedName}"`, "Failed to rename space");
    await showHUD(`Renamed space to "${sanitizedName}"`);
  } catch {
    // Error handled by utils
  }
}
