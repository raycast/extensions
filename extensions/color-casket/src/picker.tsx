import {
  Clipboard,
  closeMainWindow,
  environment,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  popToRoot,
  showHUD,
} from "@raycast/api";

import { ColorType } from "./colors/Color";
import { prepend } from "./hooks/colorSaver";
import pickColor from "./pickerHelper";

export default async () => {
  const openColorPicker = async (type: ColorType) => {
    closeMainWindow();

    const color = await pickColor(type);

    if (color === null) {
      showHUD("Cancelled");
      popToRoot();
      return;
    }

    Clipboard.copy(color.stringValue());
    prepend("history", color);
    showHUD("Copied to Clipboard");

    if (environment.launchContext?.open === "fromRender") {
      launchCommand({ name: "index", type: LaunchType.UserInitiated });
    } else {
      popToRoot();
    }
  };

  await openColorPicker(
    getPreferenceValues<{
      format: string;
    }>().format as ColorType
  );
};
