import { environment } from "@raycast/api";

/**
 * Builds a Raycast deeplink that launches the current command with the `app` argument,
 * so a shortcut can be pinned in the root search as an app-like Quicklink.
 */
export function appDeeplink(appName: string): string {
  const args = encodeURIComponent(JSON.stringify({ app: appName }));
  return `raycast://extensions/${environment.ownerOrAuthorName}/${environment.extensionName}/${environment.commandName}?arguments=${args}`;
}
