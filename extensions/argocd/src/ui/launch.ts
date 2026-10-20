/**
 * Launching this extension's own commands.
 *
 * These were `raycast://extensions/pixibixi/argocd/<command>` strings, nine of them across
 * four files. Two things are wrong with that. The store repository requires the typed
 * `launchCommand` API for same-extension launches, and the URL hardcodes the author handle and
 * the extension name, so a rename of either breaks every one of them silently: the deeplink
 * still parses, it just goes nowhere.
 *
 * `launchCommand` takes the command name from the manifest and throws when it does not exist,
 * which turns that class of mistake into an error instead of a dead action.
 */

import { LaunchType, launchCommand } from "@raycast/api";

/** Names as declared in package.json's `commands`. */
type CommandName = "search-applications" | "search-applicationsets" | "manage-instances";

function launch(name: CommandName): Promise<void> {
  return launchCommand({ name, type: LaunchType.UserInitiated });
}

export function openManageInstances(): Promise<void> {
  return launch("manage-instances");
}

export function openSearchApplications(): Promise<void> {
  return launch("search-applications");
}
