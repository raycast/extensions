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
    closeMainWindow();

    const color = await pickColor(type);

    if (color === null) {
      showHUD("Cancelled");

      if (internalLaunch) {
        launchCommand({ name: "index", type: LaunchType.UserInitiated });
      }

      return;
    }

    Clipboard.copy(color.stringValue());
    prepend("history", color);
    showHUD("Copied to Clipboard");

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
