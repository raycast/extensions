import { LaunchType } from "@raycast/api";
import { crossLaunchCommand } from "raycast-cross-extension";

export const dndLaunchOptions = {
  type: LaunchType.Background,
  extensionName: "do-not-disturb",
  ownerOrAuthorName: "yakitrak",
};

export async function setDND(enabled: boolean) {
  return crossLaunchCommand(
    {
      ...dndLaunchOptions,
      name: enabled ? "on" : "off",
      context: { supressHUD: true },
    },
    false
  ).catch(() => {
    // Do nothing here because we're going to check when mounting the extension
  });
}
