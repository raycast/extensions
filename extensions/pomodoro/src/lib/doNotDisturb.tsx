import { confirmAlert, LaunchType, open, getPreferenceValues } from "@raycast/api";
import { crossLaunchCommand, LaunchOptions } from "raycast-cross-extension";

export const { enableFocusWhileFocused } = getPreferenceValues<ExtensionPreferences>();

export const dndLaunchOptions = {
  type: LaunchType.Background,
  extensionName: "do-not-disturb",
  ownerOrAuthorName: "yakitrak",
};

export async function setDND(enabled: boolean, callbackOptions?: Partial<LaunchOptions>) {
  if (!enableFocusWhileFocused) return;
  return crossLaunchCommand(
    {
      ...dndLaunchOptions,
      name: enabled ? "on" : "off",
      context: { supressHUD: !enabled },
    },
    callbackOptions ? callbackOptions : false,
  ).catch(() => {
    // Do nothing here because we're going to check when mounting the extension
  });
}

export async function checkDNDExtensionInstall(callbackOptions?: Partial<LaunchOptions>) {
  if (!enableFocusWhileFocused) return;
  await crossLaunchCommand(
    {
      ...dndLaunchOptions,
      name: "status",
      context: { suppressHUD: true },
    },
    callbackOptions ? callbackOptions : false,
  ).catch(async () => {
    const installDND = await confirmAlert({
      title: "Need to Install Additional Extension",
      message:
        'The "Enable Do Not Disturb mode while focused" feature requires the "Do Not Distrub" extension, do you want to move to the install page now?',
    });
    if (installDND) {
      // Open the store view
      await open("raycast://extensions/yakitrak/do-not-disturb");
    }
  });
}
