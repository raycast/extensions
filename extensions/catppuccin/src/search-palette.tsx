import { useState, useMemo } from "react";
import { Grid, ActionPanel, Action, getPreferenceValues } from "@raycast/api";
import { flavors } from "@catppuccin/palette";
import { Preferences, ColorDetails } from "./types";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function SearchPalette() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState<string>("");

  const flavorOptions = Object.keys(flavors);
  const [selectedFlavor, setSelectedFlavor] = useState<string>(flavorOptions[0] || "mocha");

  const flavorColors = useMemo<Record<string, ColorDetails>>(() => {
    const flavor = flavors[selectedFlavor];
    return flavor ? flavor.colors : {};
  }, [selectedFlavor]);

  const colorEntries = useMemo(() => Object.entries(flavorColors), [flavorColors]);

  const filteredColors = useMemo(() => {
    if (!searchText) return colorEntries;

    const lowerSearchText = searchText.toLowerCase();
    return colorEntries.filter(([name]) => name.toLowerCase().includes(lowerSearchText));
  }, [searchText, colorEntries]);

  const gridSize = parseInt(preferences.gridSize, 10);
  const columns = isNaN(gridSize) || gridSize <= 0 ? 8 : gridSize;

  return (
    <Grid
      columns={columns}
      inset={Grid.Inset.Large}
      searchBarPlaceholder="Search colors..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Select Flavor" storeValue onChange={setSelectedFlavor}>
          {flavorOptions.map((flavor) => (
            <Grid.Dropdown.Item key={flavor} value={flavor} title={capitalize(flavor)} />
          ))}
        </Grid.Dropdown>
      }
    >
      {filteredColors.map(([colorName, colorDetails]) => {
        const hex = colorDetails.hex ?? "#000000";
        const { r = 0, g = 0, b = 0 } = colorDetails.rgb || {};
        const { h = 0, s = 0, l = 0 } = colorDetails.hsl || {};

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
                <Action.CopyToClipboard content={`rgb(${r}, ${g}, ${b})`} title="Copy RGB" />
                <Action.CopyToClipboard
                  content={`hsl(${h.toFixed(2)}, ${(s * 100).toFixed(2)}%, ${(l * 100).toFixed(2)}%)`}
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
