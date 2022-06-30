import { useContext } from "react";

import { Action, ActionPanel, Clipboard, closeMainWindow, List, showHUD } from "@raycast/api";

import ServicesContext from "./ServicesContext";
import { Services } from "../Extension";

import { ColorType } from "../colors/Color";
import { returnToRaycast } from "../utilities";
import pickColor from "../pickerHelper";

export default function ColorPickers() {
  const { history } = useContext(ServicesContext) as Services;

  let pickerOpened = false;

  const openColorPicker = async (type: ColorType) => {
    if (pickerOpened) {
      return;
    }

    pickerOpened = true;
    closeMainWindow();
    const color = await pickColor(type);

    if (color === null) {
      await returnToRaycast();
      await showHUD("Cancelled");
      pickerOpened = false;

      return;
    }

    history.add(color);
    Clipboard.copy(color.stringValue());
    showHUD("Copied to Clipboard");
    returnToRaycast();
    pickerOpened = false;
  };

  return (
    <List.Item
      title="Pick a Color"
      icon={{ source: "dropper.png" }}
      actions={
        <ActionPanel>
          <Action title="Pick in HEX" onAction={() => openColorPicker(ColorType.HEX)} />
          <Action title="Pick in RGB" onAction={() => openColorPicker(ColorType.RGB)} />
          <Action
            title="Pick in HSL"
            shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            onAction={() => openColorPicker(ColorType.HSL)}
          />
          <Action
            title="Pick in Keyword"
            shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            onAction={() => openColorPicker(ColorType.KEYWORD)}
          />
        </ActionPanel>
      }
    />
  );
}
