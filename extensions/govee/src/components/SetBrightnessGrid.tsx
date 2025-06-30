import { colord } from "colord";
import { useMemo } from "react";

import { Action, ActionPanel, Grid, useNavigation } from "@raycast/api";

export type SetBrightnessGridProps = {
  setBrightness: (brightness: number) => void;
};

const SetBrightnessGrid = ({ setBrightness }: SetBrightnessGridProps) => {
  const { pop } = useNavigation();

  const brightnessValues = useMemo(
    () =>
      new Array(21)
        .fill(0)
        .map((_, i) => ({
          key: `value-${i}`,
          value: i * 5,
          label: `${i * 5}%`,
          color: colord(`hsl(0, 0%, ${i * 5}%)`).toHex(),
        }))
        .reverse(),
    [],
  );

  return (
    <Grid columns={8} aspectRatio="1">
      {brightnessValues.map(({ key, value, label, color }) => (
        <Grid.Item
          key={key}
          title={label}
          content={{ color }}
          actions={
            <ActionPanel>
              <Action
                title="Set Brightness"
                onAction={() => {
                  setBrightness(value);
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
};

export default SetBrightnessGrid;
