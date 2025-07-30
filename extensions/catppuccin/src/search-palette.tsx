/* eslint-disable @raycast/prefer-title-case */
import { flavors, flavorEntries, type FlavorName } from "@catppuccin/palette";
import { Grid, ActionPanel, Action } from "@raycast/api";
import Fuse, { type IFuseOptions } from "fuse.js";
import { useState, useMemo } from "react";

import { getFlavorPreference, getGridSize } from "./utils/preferences.util";

type FlavorOrAll = FlavorName | "all";

export default function SearchPalette() {
  const [searchText, setSearchText] = useState<string>("");
  const [selectedFlavor, setSelectedFlavor] = useState<FlavorOrAll>(getFlavorPreference());

  const fuseOptions = {
    keys: ["identifier", "hex"],
    threshold: 0.5,
  } satisfies IFuseOptions<unknown>;

  const filteredColors = useMemo(() => {
    const colors =
      selectedFlavor == "all"
        ? flavorEntries.flatMap(([i, f]) =>
            f.colorEntries.map(([identifier, color]) => {
              return { identifier, flavor: i, ...color };
            }),
          )
        : flavors[selectedFlavor].colorEntries.map(([identifier, color]) => {
            return { identifier, flavor: selectedFlavor, ...color };
          });
    if (!searchText) return colors;

    const fuse = new Fuse(colors, fuseOptions);
    const results = fuse.search(searchText);

    return results.map((result) => result.item);
  }, [searchText, selectedFlavor]);

  const columns = getGridSize();

  return (
    <Grid
      columns={columns}
      searchBarPlaceholder="Search colors..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select Flavor"
          storeValue
          onChange={(newValue) => setSelectedFlavor(newValue as FlavorOrAll)}
        >
          <Grid.Dropdown.Item key="all" value="all" title="All" />
          {flavorEntries.map(([identifier, flavor]) => (
            <Grid.Dropdown.Item key={identifier} value={identifier} title={flavor.name} />
          ))}
        </Grid.Dropdown>
      }
    >
      {filteredColors.map(({ rgb, hsl, hex, name, identifier, flavor }) => {
        return (
          <Grid.Item
            key={flavor + identifier}
            title={selectedFlavor === "all" ? flavors[flavor].name + " " + name : name}
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
