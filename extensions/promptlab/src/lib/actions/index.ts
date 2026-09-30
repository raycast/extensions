import { Keyboard, environment } from "@raycast/api";
import { defaultAdvancedSettings } from "../../data/default-advanced-settings";

/**
 * Checks if the specified action is enabled for the current command.
 *
 * @param actionName The name of the action to check.
 * @param advancedSettings The advanced settings object.
 * @returns True if the action is enabled, false otherwise.
 */
export const isActionEnabled = (actionName: string, advancedSettings: typeof defaultAdvancedSettings): boolean => {
  const cmdName = environment.commandName;
  return (
    (advancedSettings.actionSettings as { [key: string]: { enabled: string[] } })[actionName]?.enabled.includes(
      cmdName,
    ) ?? true
  );
};

/**
 * Checks if any of the specified actions are enabled for the current command.
 *
 * @param actionNames The names of the actions to check.
 * @param advancedSettings The advanced settings object.
 * @returns True if any actions are enabled, false otherwise.
 */
export const anyActionsEnabled = (actionNames: string[], advancedSettings: typeof defaultAdvancedSettings): boolean => {
  const cmdName = environment.commandName;
  return actionNames.some(
    (actionName) =>
      (advancedSettings.actionSettings as { [key: string]: { enabled: string[] } })[actionName]?.enabled.includes(
        cmdName,
      ) ?? true,
  );
};

/**
 * Checks if all specified actions are enabled for the current command.
 *
 * @param actionNames The names of the actions to check.
 * @param advancedSettings The advanced settings object.
 * @returns True if all actions are enabled, false otherwise.
 */
export const allActionsEnabled = (actionNames: string[], advancedSettings: typeof defaultAdvancedSettings): boolean => {
  const cmdName = environment.commandName;
  return actionNames.every(
    (actionName) =>
      (advancedSettings.actionSettings as { [key: string]: { enabled: string[] } })[actionName]?.enabled.includes(
        cmdName,
      ) ?? true,
  );
};

/**
 * Gets the shortcut for the specified action.
 * @param actionName The name of the action to get the shortcut for.
 * @param advancedSettings The advanced settings object.
 * @returns The shortcut for the specified action.
 */
export const getActionShortcut = (
  actionName: string,
  advancedSettings: typeof defaultAdvancedSettings,
): Keyboard.Shortcut | undefined => {
  const defaultActionSettings = defaultAdvancedSettings.actionSettings as {
    [key: string]: { shortcut: Keyboard.Shortcut };
  };

  const customActionSettings = advancedSettings.actionSettings as { [key: string]: { shortcut: Keyboard.Shortcut } };

  const shortcut = defaultActionSettings[actionName]
    ? {
        // @ts-expect-error: To keep to original code
        modifiers: defaultActionSettings[actionName].shortcut.modifiers,
        // @ts-expect-error: To keep to original code
        key: defaultActionSettings[actionName].shortcut.key,
      }
    : undefined;

  if (
    advancedSettings.actionSettings &&
    actionName in customActionSettings &&
    shortcut &&
    customActionSettings[actionName]?.shortcut
  ) {
    // @ts-expect-error: To keep to original code
    shortcut.modifiers = customActionSettings[actionName].shortcut.modifiers ?? shortcut.modifiers;
    // @ts-expect-error: To keep to original code
    shortcut.key = customActionSettings[actionName].shortcut.key ?? shortcut.key;
  }
  return shortcut;
};
