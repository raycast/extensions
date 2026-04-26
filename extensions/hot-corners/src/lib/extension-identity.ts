import packageJson from "../../package.json";
import { LaunchType } from "@raycast/api";

const savePresetCommand = packageJson.commands.find((c) => c.name === "save-preset");
if (!savePresetCommand) {
  throw new Error('package.json must define a "save-preset" command');
}

/** Options to launch the Save Preset command from another command in this extension. Values come from package.json. */
export const savePresetIntraExtensionLaunch = {
  name: savePresetCommand.name,
  type: LaunchType.UserInitiated,
} as const;
