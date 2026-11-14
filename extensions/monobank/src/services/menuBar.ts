import { LaunchType, Toast, launchCommand, showToast } from "@raycast/api";
import { writeJson } from "./storage";

/** Menu bar commands only exist on macOS. */
export const isMenuBarSupported = process.platform === "darwin";

export type MenuBarCommand = "rates-menu-bar" | "jar-menu-bar" | "subscriptions-menu-bar";

// Titles of the commands in package.json.
const commandTitles: Record<MenuBarCommand, string> = {
  "rates-menu-bar": "Currency Rate Menu Bar",
  "jar-menu-bar": "Jar Progress Menu Bar",
  "subscriptions-menu-bar": "Subscriptions Menu Bar",
};

/** Runs a menu bar command in the background so it shows changed data. Does nothing when it's disabled. */
export async function refreshMenuBar(command: MenuBarCommand) {
  if (!isMenuBarSupported) return;
  try {
    await launchCommand({ name: command, type: LaunchType.Background });
  } catch {
    // Disabled: it reads the data again once it's enabled.
  }
}

/**
 * Saves `id` as the item a menu bar command shows in its title, and refreshes that command so the title
 * changes right away. When the command is disabled, the choice is still saved for when it's enabled.
 */
export async function showInMenuBar(options: { key: string; id: string; command: MenuBarCommand; title: string }) {
  const { key, id, command, title } = options;
  await writeJson(key, id);

  try {
    await launchCommand({ name: command, type: LaunchType.Background });
    await showToast({ style: Toast.Style.Success, title: `${title} is now in the menu bar` });
  } catch (error) {
    console.error(error);
    await showToast({
      style: Toast.Style.Failure,
      title: `Enable the "${commandTitles[command]}" command to see it in the menu bar`,
    });
  }
}
