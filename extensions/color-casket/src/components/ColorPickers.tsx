import { runAppleScript } from "run-applescript";
import { useContext } from "react";

import { Action, ActionPanel, closeMainWindow, List, open } from "@raycast/api";

import ServicesContext from "./ServicesContext";
import { Services } from "../Extension";

import fromAppleColorFactory from "../colors/FromAppleColorFactory";
import { ColorType } from "../colors/Color";
import { APPLE } from "color-convert/conversions";

export default function ColorPickers() {
  const { history } = useContext(ServicesContext) as Services;

  let pickerOpened = false;

  const pickColor = async (type: ColorType) => {
    if (pickerOpened) {
      return;
    }

    const returnToRaycast = () =>
      setTimeout(() => {
        open("raycast://");
      }, 100);

    try {
      pickerOpened = true;
      closeMainWindow();
      const color = (await runAppleScript("choose color default color {65535, 65535, 65535}"))
        .split(", ")
        .map((value) => parseInt(value)) as APPLE;

      history.add(fromAppleColorFactory(color, type));
    } catch (e) {
      returnToRaycast();
    } finally {
      returnToRaycast();
      pickerOpened = false;
    }
  };

  return (
    <List.Item
      title="Pick a Color"
      icon={{ source: "dropper.png" }}
      actions={
        <ActionPanel>
          <Action title="Pick in HEX" onAction={() => pickColor(ColorType.HEX)} />
          <Action title="Pick in RGB" onAction={() => pickColor(ColorType.RGB)} />
          <Action
            title="Pick in HSL"
            shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            onAction={() => pickColor(ColorType.HSL)}
          />
          <Action
            title="Pick in Keyword"
            shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            onAction={() => pickColor(ColorType.KEYWORD)}
          />
        </ActionPanel>
      }
    />
  );
}
