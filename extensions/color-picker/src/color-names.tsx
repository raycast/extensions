import { useEffect, useState } from "react";
import { List, getPreferenceValues } from "@raycast/api";
import colorNamer from "color-namer";
import { ColorNameListItem } from "./components/ColorNames";
import { getColorByPlatform, getColorByProximity, normalizeColorHex } from "./utils";
import { SortType } from "./types";

export default function ColorNames() {
  const [isSearching, setIsSearching] = useState(false);
  const [searchString, setSearchString] = useState<string>("");
  const [colors, setColors] = useState<colorNamer.Colors<colorNamer.Palette>>();
  const [sortBy, setSortBy] = useState<SortType>("platform");
  const normalizedSearchString = normalizeColorHex(searchString);
  const { colorNamesPerGroup = "5" } = getPreferenceValues<Preferences.ColorNames>();

  const loadColors = (searchString: string) => {
    setIsSearching(true);
    try {
      const colors = colorNamer(searchString);
      setColors(colors);
    } catch {
      setColors(undefined);
    }
    setIsSearching(false);
  };

  useEffect(() => {
    loadColors(normalizedSearchString);
  }, [normalizedSearchString]);

  return (
    <List
      isLoading={isSearching}
      onSearchTextChange={setSearchString}
      searchBarPlaceholder="Search HEX (#00ff00)"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort colors by"
          storeValue
          onChange={(v) => {
            setSortBy(v as SortType);
          }}
        >
          <List.Dropdown.Item value="platform" title="Sort by Platform" />
          <List.Dropdown.Item value="proximity" title="Sort by Proximity" />
        </List.Dropdown>
      }
    >
      {colors ? (
        sortBy === "platform" ? (
          getColorByPlatform(normalizedSearchString, colors).map(([palette, colorList]) => (
            <List.Section key={palette} title={palette}>
              {colorList.slice(0, Number(colorNamesPerGroup)).map((color, index) => (
                <ColorNameListItem key={`color-name-${color.name}-${index}`} color={color} />
              ))}
            </List.Section>
          ))
        ) : (
          getColorByProximity(colors).map((color, index) => (
            <ColorNameListItem key={`color-name-${color.name}-${index}`} color={color} />
          ))
        )
      ) : (
        <List.EmptyView title={searchString ? "No colors found" : "Search for a color to see"} />
      )}
    </List>
  );
}
