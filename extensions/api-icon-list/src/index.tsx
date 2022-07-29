import { Action, ActionPanel, Color, Icon, Grid } from "@raycast/api";
import _ from "lodash";
import { useState } from "react";

function getColorName(color: Color) {
  return Object.entries(Color).find(([, value]) => value === color)?.[0];
}

export default function Command() {
  const [color, setColor] = useState(Color.PrimaryText);

  return (
    <Grid
      itemSize={Grid.ItemSize.Small}
      inset={Grid.Inset.Large}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Change Color" value={color} onChange={(newColor) => setColor(newColor as Color)}>
          {Object.entries(Color).map(([name, color]) => (
            <Grid.Dropdown.Item
              key={name}
              title={_.startCase(name)}
              value={color}
              icon={{ source: Icon.Circle, tintColor: color }}
            />
          ))}
        </Grid.Dropdown>
      }
    >
      {Object.entries(Icon).map(([name, icon]) => (
        <Grid.Item
          key={name}
          title={name}
          content={{ source: icon, tintColor: color }}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Icon" content={`Icon.${name}`} />
              <Action.CopyToClipboard
                title="Copy Colored Icon"
                content={`{ source: Icon.${name}, tintColor: Color.${getColorName(color)}}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
