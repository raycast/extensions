import { useContext } from "react";

import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  List,
} from "@raycast/api";

import ServicesContext from "./ServicesContext";
import { Services } from "../Extension";

import { ColorType } from "../colors/Color";
import GeneralActions from "./GeneralActions";

export default function ColorPickers() {
  const { history } = useContext(ServicesContext) as Services;

  const openColorPicker = (type: ColorType) => {
    launchCommand({ name: "picker", type: LaunchType.UserInitiated, context: { internal: true, type } });
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
          <Action
            title={`Pick in ${defaultFormat}`}
            icon={Icon.Brush}
            onAction={() => openColorPicker(defaultFormat)}
          />
          <ActionPanel.Section key="pickers">
            {orderedPickFormats.map((type, index) => (
              <Action
                key={index}
                title={`Pick in ${type}`}
                icon={Icon.Brush}
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
