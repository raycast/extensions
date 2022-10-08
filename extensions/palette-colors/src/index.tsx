import { useEffect, useState } from "react";
import { ActionPanel, Action, Grid } from "@raycast/api";
import { Theme, Color, BackgroundColor } from "@adobe/leonardo-contrast-colors";
import ColorScheme from "color-scheme";

const random = new BackgroundColor({
  name: "random",
  colorKeys: ["#cadada"],
});

const generateColors = (schemeType = "mono"): string[] => {
  const scheme = new ColorScheme();
  scheme
    .from_hue(Math.floor(Math.random() * 360))
    .scheme(schemeType)
    .variation("soft");

  const colors = scheme.colors().map((color: string) => {
    return new Color({
      name: "color",
      colorKeys: [color],
      ratios: [3, 4.5],
    });
  });

  const theme = new Theme({ colors, backgroundColor: random, lightness: 7 });

  return Array.from(new Set<string>(theme.contrastColorValues)).sort();
};

export default function Command() {
  const [isLoading] = useState(false);
  const [type, setType] = useState("mono");
  const [colors, setColors] = useState(generateColors(type));

  useEffect(() => {
    setColors(generateColors(type));
  }, [type]);

  return (
    <Grid
      inset={Grid.Inset.Large}
      isLoading={isLoading}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select Color Scheme Variant"
          storeValue={true}
          onChange={(newValue) => setType(newValue)}
        >
          <Grid.Dropdown.Section title="Color Scheme Variants">
            <Grid.Dropdown.Item title="Mono" value="mono" />
            <Grid.Dropdown.Item title="Contrast" value="contrast" />
            <Grid.Dropdown.Item title="Tetrade" value="tetrade" />
            <Grid.Dropdown.Item title="Analogic" value="analogic" />
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {colors.map((color: string) => (
        <Grid.Item
          key={color}
          content={{
            color,
          }}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={color} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
