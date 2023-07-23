import { environment } from "@raycast/api";
import { defaultAdvancedSettings } from "../data/default-advanced-settings";

export const isActionEnabled = (actionName: string, advancedSettings: typeof defaultAdvancedSettings): boolean => {
  const cmdName = environment.commandName;
  return (advancedSettings.actionSettings as { [key: string]: { enabled: string[] } })[actionName].enabled.includes(
    cmdName
  );
};

export const anyActionsEnabled = (actionNames: string[], advancedSettings: typeof defaultAdvancedSettings): boolean => {
  const cmdName = environment.commandName;
  return actionNames.some((actionName) =>
    (advancedSettings.actionSettings as { [key: string]: { enabled: string[] } })[actionName].enabled.includes(cmdName)
  );
};

export const allActionsEnabled = (actionNames: string[], advancedSettings: typeof defaultAdvancedSettings): boolean => {
  const cmdName = environment.commandName;
  return actionNames.every((actionName) =>
    (advancedSettings.actionSettings as { [key: string]: { enabled: string[] } })[actionName].enabled.includes(cmdName)
  );
};
