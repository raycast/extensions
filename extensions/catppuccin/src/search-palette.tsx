import { useState, useMemo } from "react";
import { Grid, ActionPanel, Action, getPreferenceValues } from "@raycast/api";
import { flavors } from "@catppuccin/palette";

interface Preferences {
  gridSize: string;
}

interface ColorDetails {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
}

export default function SearchPalette() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState<string>("");
  const [selectedFlavor, setSelectedFlavor] = useState<string>("mocha");
  const flavorOptions = Object.keys(flavors);

  const flavorColors = useMemo<Record<string, ColorDetails>>(() => flavors[selectedFlavor].colors, [selectedFlavor]);

  const colorEntries = useMemo(() => Object.entries(flavorColors), [flavorColors]);

  const filteredColors = useMemo(() => {
    return searchText
      ? colorEntries.filter(([name]) => name.toLowerCase().includes(searchText.toLowerCase()))
      : colorEntries;
  }, [searchText, colorEntries]);

  return (
    <Grid
      columns={parseInt(preferences.gridSize)}
      inset={Grid.Inset.Large}
      searchBarPlaceholder="Search colors..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Select Flavor" storeValue onChange={setSelectedFlavor}>
          {flavorOptions.map((flavor) => (
            <Grid.Dropdown.Item key={flavor} value={flavor} title={flavor.charAt(0).toUpperCase() + flavor.slice(1)} />
          ))}
        </Grid.Dropdown>
      }
    >
      {filteredColors.map(([colorName, colorDetails]) => {
        const hex = colorDetails.hex ?? "#000000";

        return (
          <Grid.Item
            key={colorName}
            title={colorName}
            subtitle={hex}
            content={{
              color: {
                light: hex,
                dark: hex,
                adjustContrast: false,
              },
            }}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={hex} title="Copy HEX" />
                <Action.CopyToClipboard
                  content={`rgb(${colorDetails.rgb.r}, ${colorDetails.rgb.g}, ${colorDetails.rgb.b})`}
                  title="Copy RGB"
                />
                <Action.CopyToClipboard
                  content={`hsl(${colorDetails.hsl.h.toFixed(2)}, ${(colorDetails.hsl.s * 100).toFixed(2)}%, ${(colorDetails.hsl.l * 100).toFixed(2)}%)`}
                  title="Copy HSL"
                />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
