/* eslint-disable @raycast/prefer-title-case */
import { useState, useMemo } from "react";
import { Grid, ActionPanel, Action } from "@raycast/api";
import type { CatppuccinFlavor, FlavorName } from "@catppuccin/palette";
import { getGridSize } from "./utils/preferences.util";
import { getAllFlavors, getFlavorColors, capitalize } from "./utils/palette.util";

export default function SearchPalette() {
  const [searchText, setSearchText] = useState<string>("");

  const flavorOptions = getAllFlavors();
  const [selectedFlavor, setSelectedFlavor] = useState<FlavorName>(flavorOptions[0] || "mocha");

  const flavorColors = useMemo<CatppuccinFlavor>(() => {
    return getFlavorColors(selectedFlavor);
  }, [selectedFlavor]);

  const filteredColors = useMemo(() => {
    if (!searchText) return flavorColors.colorEntries;

    const lowerSearchText = searchText.toLowerCase();
    return flavorColors.colorEntries.filter(([name]) => name.toLowerCase().includes(lowerSearchText));
  }, [searchText, flavorColors.colorEntries]);

  const columns = getGridSize();

  const handleFlavorChange = (newValue: string) => {
    setSelectedFlavor(newValue as FlavorName);
  };

  return (
    <Grid
      columns={columns}
      searchBarPlaceholder="Search colors..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Select Flavor" storeValue onChange={handleFlavorChange}>
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
