import {
  Clipboard,
  closeMainWindow,
  environment,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  showHUD,
} from "@raycast/api";

import { ColorType } from "./colors/Color";
import { prepend } from "./hooks/colorSaver";
import pickColor from "./pickerHelper";

export default async () => {
  const internalLaunch = environment.launchContext?.internal;

  const openColorPicker = async (type: ColorType) => {
    await closeMainWindow();

    const color = await pickColor(type);

    if (color === null) {
      await showHUD("Cancelled");

      if (internalLaunch) {
        launchCommand({ name: "index", type: LaunchType.UserInitiated });
      }

      return;
    }

    await Clipboard.copy(color.stringValue());
    await prepend("history", color);
    await showHUD("Copied to Clipboard");

    if (internalLaunch) {
      launchCommand({ name: "index", type: LaunchType.UserInitiated });
    }
  };

  await openColorPicker(
    internalLaunch
      ? environment.launchContext?.type
      : (getPreferenceValues<{
          format: string;
        }>().format as ColorType)
  );
};
