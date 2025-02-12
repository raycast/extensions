import { showToast, Toast } from "@raycast/api";
import { listScreenInfo } from "./displayplacer";

export async function getCommandForCurrentSettings() {
  const result = listScreenInfo();

  if (!result.currentCommand) {
    showToast({
      style: Toast.Style.Failure,
      title: "Could not get current display settings",
    });
    return null;
  }

  return result.currentCommand;
}
