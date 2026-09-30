import { LaunchProps, showHUD } from "@raycast/api";
import { renameCurrentSpace } from "./utils";

export default async function Command(props: LaunchProps<{ arguments: Arguments.RenameCurrentSpace }>) {
  const { newName } = props.arguments;

  try {
    await renameCurrentSpace(newName, "Failed to rename space");
    await showHUD(`Renamed space to "${newName}"`);
  } catch {
    // Error handled by utils
  }
}
