import {
  LaunchType,
  Toast,
  launchCommand,
  openExtensionPreferences,
} from "@raycast/api";

/** Opens Manage Tools and Models from another command. */
export function openSetup() {
  launchCommand({
    name: "manage-tools-and-models",
    type: LaunchType.UserInitiated,
  }).catch(() => undefined);
}

/** A toast action that helps with an error: set up a missing tool, or sign in. */
export function errorAction(message?: string): Toast.ActionOptions | undefined {
  if (!message) return undefined;
  if (/Manage Tools and Models/.test(message))
    return { title: "Manage Tools and Models", onAction: openSetup };
  if (/Browser Sign-In/.test(message))
    return {
      title: "Open Extension Preferences",
      onAction: openExtensionPreferences,
    };
  return undefined;
}
