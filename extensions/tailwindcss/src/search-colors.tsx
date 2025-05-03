import { Action, ActionPanel, Grid } from "@raycast/api";
import { hex } from "color-convert";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import colors from "tailwindcss/colors";
import { capitalize } from "lodash";
import { useEffect, useState } from "react";

const hiddenColors = [
  "inherit",
  "current",
  "transparent",
  "black",
  "white",
  "lightBlue",
  "coolGray",
  "trueGray",
  "warmGray",
  "blueGray",
];

export default function SearchColors() {
  const [searchText, setSearchText] = useState("");
  const [filteredColors, filterColors] = useState(Object.entries(colors));
  useEffect(() => {
    // If there's no search text, show all colors
    if (!searchText) {
      filterColors(Object.entries(colors));
      return;
    }
    // If the search text starts with a number, we assume it's a shade
    if (searchText.match(/^\d/)) {
      const filteredShades = Object.entries(colors)
        .map(([name, shades]) => {
          const t = Object.entries(shades).filter(([shade]) => shade.includes(searchText));
          return [name, Object.fromEntries(t)];
        })
        .filter(([name, shades]) => Object.keys(shades).length > 0);
      console.log(filteredShades);
      filterColors(filteredShades as any);
      return;
    }
    // Otherwise, we assume it's a color name
    filterColors(Object.entries(colors).filter(([name]) => name.includes(searchText)));
  }, [searchText]);
  return (
    <Grid searchBarPlaceholder="Search colors by name and shade..." columns={8} onSearchTextChange={setSearchText}>
      {filteredColors
        .filter(([name]) => !hiddenColors.includes(name))
        .map(([name, shades]) => (
          <Grid.Section key={name} title={capitalize(name)}>
            {Object.entries(shades).map(([shade, value]) => (
              <Grid.Item
                key={shade}
                title={shade}
                subtitle={value as string}
                content={{
                  color: {
                    light: value as string,
                    dark: value as string,
                    adjustContrast: false,
                  },
                }}
                keywords={[
                  name,
                  name + shade,
                  `${name} ${shade}`,
                  `${name}-${shade}`,
                  value as string,
                  (value as string).replace("#", ""),
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.CopyToClipboard
                        title="Copy HEX"
                        content={value as string}
                        shortcut={{ modifiers: ["cmd"], key: "h" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy RGB"
                        content={`rgb(${hex.rgb(value as string).join(", ")})`}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy HSL"
                        content={`hsl(${hex.hsl(value as string).join(", ")})`}
                        shortcut={{ modifiers: ["cmd"], key: "s" }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action.CopyToClipboard
                        title="Copy Background Class"
                        content={`bg-${name}-${shade}`}
                        shortcut={{ modifiers: ["cmd", "opt"], key: "b" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Text Class"
                        content={`text-${name}-${shade}`}
                        shortcut={{ modifiers: ["cmd", "opt"], key: "t" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Border Class"
                        content={`border-${name}-${shade}`}
                        shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </Grid.Section>
        ))}
    </Grid>
  );
}
