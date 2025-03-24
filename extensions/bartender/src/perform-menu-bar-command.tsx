import { closeMainWindow, getPreferenceValues, LaunchProps, LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { getStoredShortcuts } from "./hooks";
import { ActionType } from "./types";
import { handlePerformMenuBarShortcut, handlePerformMenuBarAction } from "./utils";

const MenuBarClickContext = Type.Object({
  type: Type.Literal("menuBarClick"),
  menuBarId: Type.String(),
  actionType: Type.Enum(ActionType),
});
type MenuBarItemContext = typeof MenuBarClickContext.static;

const ShortcutContext = Type.Object({
  type: Type.Literal("shortcut"),
  shortcutName: Type.String(),
});
type ShortcutContext = typeof ShortcutContext.static;

const PerformMenuBarCommandLaunchContext = Type.Union([MenuBarClickContext, ShortcutContext]);
export type PerformMenuBarCommandLaunchContext = typeof PerformMenuBarCommandLaunchContext.static;

const LAST_COMMAND_KEY = "last-successful-command";

async function runShortcut(commandToExecute: ShortcutContext) {
  const shortcuts = await getStoredShortcuts();
  const shortcut = shortcuts.find((shortcut) => shortcut.name === commandToExecute.shortcutName);
  if (shortcut) {
    return await handlePerformMenuBarShortcut(shortcut);
  } else {
    await showFailureToast(`The shortcut "${commandToExecute.shortcutName}" does not exist.`, {
      title: "Shortcut Not Found",
    });
    return false;
  }
}

async function runMenuBarItem(commandToExecute: MenuBarItemContext) {
  return await handlePerformMenuBarAction(commandToExecute.menuBarId, commandToExecute.actionType);
}

async function getLastCommand(): Promise<PerformMenuBarCommandLaunchContext | undefined> {
  const lastCommandJson = await LocalStorage.getItem<string>(LAST_COMMAND_KEY);
  if (lastCommandJson) {
    try {
      return Value.Parse(PerformMenuBarCommandLaunchContext, JSON.parse(lastCommandJson));
    } catch (e) {
      console.error("Failed to parse last command:", e);
    }
  }
  return undefined;
}

export default async function Command({
  launchContext,
}: LaunchProps<{
  launchContext?: PerformMenuBarCommandLaunchContext;
}>) {
  const { runLastCommandWhenNoContext } = getPreferenceValues<Preferences.PerformMenuBarCommand>();

  let command = launchContext;
  if (!command && runLastCommandWhenNoContext) {
    command = await getLastCommand();
  }

  if (!command) {
    const message = runLastCommandWhenNoContext
      ? "This command is normally used through deep links or quick links, but will run the last successful command by default. No previous command was found."
      : "This command is normally used through deep links or quick links. No command was provided.";

    await showFailureToast(message, {
      title: "No Command Provided",
    });
    return;
  }

  await closeMainWindow();

  let result: boolean;
  switch (command.type) {
    case "menuBarClick":
      result = await runMenuBarItem(command);
      break;
    case "shortcut":
      result = await runShortcut(command);
      break;
    default:
      return command satisfies never;
  }
  if (result) {
    if (runLastCommandWhenNoContext) {
      try {
        await LocalStorage.setItem(LAST_COMMAND_KEY, JSON.stringify(command));
      } catch (e) {
        console.error("Failed to store last command:", e);
        // Ignore the error, as we don't want to block the command execution
      }
    }
  }
}
