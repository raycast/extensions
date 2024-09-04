import { useState, useMemo } from "react";
import { Grid, ActionPanel, Action } from "@raycast/api";

interface ColorDetails {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
}

interface ColorGridProps {
  flavorColors: Record<string, ColorDetails>;
}

export default function ColorGrid({ flavorColors }: ColorGridProps) {
  const [columns, setColumns] = useState<string>("8");
  const [searchText, setSearchText] = useState<string>("");

  const colorEntries = useMemo(() => Object.entries(flavorColors), [flavorColors]);

  const filteredColors = useMemo(() => {
    return searchText
      ? colorEntries.filter(([name]) => name.toLowerCase().includes(searchText.toLowerCase()))
      : colorEntries;
  }, [searchText, colorEntries]);

  return (
    <Grid
      columns={parseInt(columns)}
      inset={Grid.Inset.Large}
      searchBarPlaceholder="Search colors..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Grid Item Size" storeValue onChange={setColumns}>
          <Grid.Dropdown.Item title="Small" value="8" />
          <Grid.Dropdown.Item title="Medium" value="5" />
          <Grid.Dropdown.Item title="Large" value="3" />
        </Grid.Dropdown>
      }
    >
      {filteredColors.map(([colorName, colorDetails]) => (
        <Grid.Item
          key={colorName}
          title={colorName}
          subtitle={colorDetails.hex}
          content={{
            color: {
              light: colorDetails.hex,
              dark: colorDetails.hex,
              adjustContrast: false,
            },
          }}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={colorDetails.hex} title="Copy HEX" />
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
      ))}
    </Grid>
  );
}
