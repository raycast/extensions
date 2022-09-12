import { useContext } from "react";

import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  getPreferenceValues,
  Keyboard,
  List,
  showHUD,
} from "@raycast/api";

import ServicesContext from "./ServicesContext";
import { Services } from "../Extension";

import { ColorType } from "../colors/Color";
import { returnToRaycast } from "../utilities";
import pickColor from "../pickerHelper";
import GeneralActions from "./GeneralActions";

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

  const defaultFormat = getPreferenceValues<{
    format: string;
  }>().format as ColorType;

  const orderedPickFormats = Object.values(ColorType).filter((color) => color !== defaultFormat);

  const shortcuts: Keyboard.Shortcut[] = [
    { modifiers: ["cmd"], key: "enter" },
    { modifiers: ["cmd", "shift"], key: "." },
    { modifiers: ["cmd", "shift"], key: "," },
  ];

  return (
    <List.Item
      title="Pick a Color"
      icon={{ source: "dropper.png" }}
      actions={
        <ActionPanel>
          <Action title={`Pick in ${defaultFormat}`} onAction={() => openColorPicker(defaultFormat)} />
          <ActionPanel.Section key="pickers">
            {orderedPickFormats.map((type, index) => (
              <Action
                key={index}
                title={`Pick in ${type}`}
                shortcut={shortcuts[index]}
                onAction={() => openColorPicker(type)}
              />
            ))}
          </ActionPanel.Section>
          <GeneralActions history={history} />
        </ActionPanel>
      }
    />
  );
}
