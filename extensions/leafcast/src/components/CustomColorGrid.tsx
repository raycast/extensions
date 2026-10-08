import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import tinycolor from "tinycolor2";
import { AddCustomColorForm } from "./AddCustomColorForm";
import { useState } from "react";
import { capitalize, createHsvColorWithName } from "../utils";
import { HsvWithName } from "../types";

interface Props {
  colors: HsvWithName[];
  onDeleteCustomColor: (color: HsvWithName) => void;
  onSetCustomColor: (color: tinycolor.ColorFormats.HSV) => void;
}

export function CustomColorGrid({ colors: colorsFromProps, onDeleteCustomColor, onSetCustomColor }: Props) {
  // We need this state to deal with a bug where the props are not updating after adding/removing a color
  const [colors, setColors] = useState<HsvWithName[]>(colorsFromProps);

  function handleSetCustomColor(color: tinycolor.ColorFormats.HSV) {
    const hsvColor = createHsvColorWithName(color);

    setColors((colors) => [...colors.filter((color) => color.name !== hsvColor.name), hsvColor]);

    onSetCustomColor(color);
  }

  function handleDeleteCustomColor(color: HsvWithName) {
    setColors((colors) => colors.filter((currentColor) => currentColor.name !== color.name));

    onDeleteCustomColor(color);
  }

  return (
    <Grid
      actions={
        <ActionPanel>
          <Action.Push
            title="Add Custom Color"
            icon={Icon.PlusCircle}
            target={<AddCustomColorForm onSetCustomColor={handleSetCustomColor} />}
          />
        </ActionPanel>
      }
    >
      <Grid.Item
        key="add-custom-color"
        content={Icon.PlusCircleFilled}
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Custom Color"
              icon={Icon.PlusCircleFilled}
              target={<AddCustomColorForm onSetCustomColor={handleSetCustomColor} />}
            />
          </ActionPanel>
        }
        title="Add Custom Color"
      />
      {colors.map((color) => (
        <Grid.Item
          key={color.name}
          content={{
            color: {
              light: tinycolor(color.hsv).toHexString(),
              dark: tinycolor(color.hsv).toHexString(),
              adjustContrast: false,
            },
          }}
          actions={
            <ActionPanel>
              <Action title="Set Color" onAction={() => onSetCustomColor(color.hsv)} />
              <Action
                title="Delete Color"
                style={Action.Style.Destructive}
                onAction={() => handleDeleteCustomColor(color)}
              />
            </ActionPanel>
          }
          title={capitalize(color.name)}
          subtitle={tinycolor(color.hsv).toHsvString()}
        />
      ))}
    </Grid>
  );
}
