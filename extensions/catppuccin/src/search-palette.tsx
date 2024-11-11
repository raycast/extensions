import { useState, useMemo } from "react";
import { Grid, ActionPanel, Action, getPreferenceValues } from "@raycast/api";
import { flavors } from "@catppuccin/palette";
import { Preferences } from "./types";
import type { CatppuccinFlavor } from "@catppuccin/palette";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function SearchPalette() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState<string>("");

  const flavorOptions = Object.keys(flavors);
  const [selectedFlavor, setSelectedFlavor] = useState<string>(flavorOptions[0] || "mocha");

  const flavorColors = useMemo<CatppuccinFlavor>(() => {
    return flavors[selectedFlavor];
  }, [selectedFlavor]);

  const filteredColors = useMemo(() => {
    if (!searchText) return flavorColors.colorEntries;

    const lowerSearchText = searchText.toLowerCase();
    return flavorColors.colorEntries.filter(([name]) => name.toLowerCase().includes(lowerSearchText));
  }, [searchText, flavorColors.colorEntries]);

  const gridSize = parseInt(preferences.gridSize, 10);
  const columns = isNaN(gridSize) || gridSize <= 0 ? 8 : gridSize;

  return (
    <Grid
      columns={columns}
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
      {filteredColors.map(([identifier, { rgb, hsl, hex, name }]) => {
        return (
          <Grid.Item
            key={identifier}
            title={name}
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
                <Action.CopyToClipboard content={`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`} title="Copy RGB" />
                <Action.CopyToClipboard
                  content={`hsl(${hsl.h.toFixed(2)}, ${(hsl.s * 100).toFixed(2)}%, ${(hsl.l * 100).toFixed(2)}%)`}
                  title="Copy HSL"
                />
                <Action.CopyToClipboard content={name} title="Copy Name" />
                <Action.CopyToClipboard content={identifier} title="Copy Identifier" />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
