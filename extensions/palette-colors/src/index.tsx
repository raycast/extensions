import { useEffect, useRef, useState } from "react";
import { ActionPanel, Action, Grid, Icon } from "@raycast/api";
import { Theme, Color } from "@adobe/leonardo-contrast-colors";
import ColorScheme from "color-scheme";
import { Cache } from "@raycast/api";
import { baseBackgroundColor, colorsKey, SchemeTypes, typeKey } from "./constants";

const cache = new Cache();

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

  const theme = new Theme({ colors, backgroundColor: baseBackgroundColor, lightness: 7 });

  return Array.from(new Set<string>(theme.contrastColorValues)).sort();
};

export default function Command() {
  const [type, setType] = useState(() => cache.get(typeKey) || SchemeTypes.Mono);
  const [colors, setColors] = useState(() => {
    const cachedColors = cache.get(colorsKey);

    if (cachedColors) {
      try {
        return JSON.parse(cachedColors);
      } catch (_error) {
        // ignore and generate new colors
      }
    }

    return generateColors(type);
  });
  const prevType = useRef<string>();

  useEffect(() => {
    if (type && prevType.current !== type && cache.get(typeKey) !== type) {
      const newColors = generateColors(type);

      setColors(newColors);

      cache.set(colorsKey, JSON.stringify(newColors));
      cache.set(typeKey, type);
    }
  }, [type]);

  useEffect(() => {
    cache.set(colorsKey, JSON.stringify(colors));
  }, [colors]);

  return (
    <Grid
      searchBarAccessory={
        <Grid.Dropdown tooltip="Select Color Scheme Variant" storeValue onChange={(newValue) => setType(newValue)}>
          <Grid.Dropdown.Section title="Color Scheme Variants">
            <Grid.Dropdown.Item title="Mono" value={SchemeTypes.Mono} />
            <Grid.Dropdown.Item title="Contrast" value={SchemeTypes.Contrast} />
            <Grid.Dropdown.Item title="Tetrade" value={SchemeTypes.Tetrade} />
            <Grid.Dropdown.Item title="Analogic" value={SchemeTypes.Analogic} />
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {colors.map((color: string) => (
        <Grid.Item
          key={color}
          title={color}
          content={{ color: { light: color, dark: color, adjustContrast: false } }}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={color} />
              <Action title="Reload Colors" icon={Icon.Repeat} onAction={() => setColors(generateColors(type))} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
