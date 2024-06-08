import { Action, ActionPanel, Grid } from "@raycast/api";
import { useEffect, useState } from "react";
import { from } from "nearest-color";
import { VersionsFilterDropdown, VersionsFilterType } from "./components/filter";
import { convert } from "./convert-colors";
import colorsSets from "./colorsSets";

const isValidColor = (input: string) => /^#((?:[0-9a-f]{3}){1,2})$/i.test(input);

interface ColorMatch {
  name: string;
  value: string;
}

export default function Command() {
  const [userColor, setUserColor] = useState("");

  const [colorNotValid, setColorNotValid] = useState(false);

  const [tailwindVersion, setTailwindVersion] = useState<VersionsFilterType>(VersionsFilterType.v3_3);

  const [nearestTailwindColor, setNearestTailwindColor] = useState<ColorMatch | null>(null);

  useEffect(() => {
    filter();
  }, [userColor, tailwindVersion]);

  const onSearchTextChange = (value: string) => {
    if (value.length === 0) {
      return;
    }

    if (!value.match("#")) {
      value = `#${value}`;
    }

    setUserColor(value);
  };

  const onVersionChange = (newValue: VersionsFilterType) => {
    setTailwindVersion(newValue);
  };

  const filter = () => {
    const tailwindColors = convert(colorsSets[tailwindVersion]);

    if (!isValidColor(userColor)) {
      setNearestTailwindColor(null);
      setColorNotValid(true);
      return;
    }

    const nearestColor = from(tailwindColors)(userColor);
    setNearestTailwindColor(nearestColor);
    setColorNotValid(false);
  };

  return (
    <Grid
      columns={8}
      onSearchTextChange={onSearchTextChange}
      navigationTitle={`Find the color in Tailwind ${tailwindVersion}`}
      searchBarPlaceholder={`Find the color in Tailwind ${tailwindVersion}`}
      searchBarAccessory={VersionsFilterDropdown({ onSelect: onVersionChange })}
    >
      {colorNotValid && userColor && <Grid.EmptyView title="Invalid color" icon="⚠️" />}

      {nearestTailwindColor != null && (
        <>
          <Grid.Section title="Your Color">
            <Grid.Item
              title={userColor}
              content={{
                color: {
                  light: userColor,
                  dark: userColor,
                  adjustContrast: false,
                },
              }}
            />
          </Grid.Section>
          <Grid.Section title="Tailwind's color">
            <Grid.Item
              title={nearestTailwindColor.name}
              content={{
                color: {
                  light: nearestTailwindColor.value,
                  dark: nearestTailwindColor.value,
                  adjustContrast: false,
                },
              }}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Background Class"
                    content={`bg-${nearestTailwindColor.name}`}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "b" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Text Class"
                    content={`text-${nearestTailwindColor.name}`}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "t" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Border Class"
                    content={`border-${nearestTailwindColor.name}`}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
                  />
                </ActionPanel>
              }
            />
          </Grid.Section>
        </>
      )}
    </Grid>
  );
}
