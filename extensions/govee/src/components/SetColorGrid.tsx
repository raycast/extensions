import { colord } from "colord";
import { useCallback, useState } from "react";

import { Action, ActionPanel, Grid, useNavigation } from "@raycast/api";

export type SetColorGridProps = {
  setColor: (color: { r: number; g: number; b: number }) => void;
};

const SetColorGrid = ({ setColor }: SetColorGridProps) => {
  const { pop } = useNavigation();
  const [amountOfColors, setAmountOfColors] = useState(16);

  const colorValues = useCallback(
    (numberOfColors: number) =>
      new Array(numberOfColors).fill(null).map((_, i) => {
        const c = colord(`hsl(${i * (360 / numberOfColors)}, 100%, 50%)`);
        return {
          key: `value-${i}`,
          value: c.toRgb(),
          color: c.toHex(),
        };
      }),
    [],
  );

  return (
    <Grid
      columns={8}
      aspectRatio="16/9"
      inset={Grid.Inset.Zero}
      fit={Grid.Fit.Fill}
      filtering={false}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select Amount of Colors"
          storeValue={true}
          onChange={(newValue) => {
            if (!newValue) return;
            setAmountOfColors(parseInt(newValue, 10));
          }}
        >
          <Grid.Dropdown.Section title="Colors">
            <Grid.Dropdown.Item value={"16"} title="16 colors" />
            <Grid.Dropdown.Item value={"32"} title="32 colors" />
            <Grid.Dropdown.Item value={"64"} title="64 colors" />
            <Grid.Dropdown.Item value={"128"} title="128 colors" />
            <Grid.Dropdown.Item value={"256"} title="256 colors" />
            <Grid.Dropdown.Item value={"360"} title="360 colors" />
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {colorValues(amountOfColors).map(({ key, value, color }) => (
        <Grid.Item
          key={key}
          id={color}
          content={{ color }}
          actions={
            <ActionPanel>
              <Action
                title="Set Color"
                onAction={() => {
                  setColor(value);
                  pop();
                }}
              />
              <Action
                title="Test Color"
                onAction={() => {
                  setColor(value);
                }}
              />
              <Action.CopyToClipboard title="Copy Hex Color" content={color} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
};

export default SetColorGrid;
