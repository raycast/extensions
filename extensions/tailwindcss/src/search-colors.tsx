import { Action, ActionPanel, Grid } from "@raycast/api";
import { hex } from "color-convert";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import colors from "tailwindcss/colors";
import { capitalize } from "lodash";

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
  return (
    <Grid searchBarPlaceholder="Search colors by name and shade..." itemSize={Grid.ItemSize.Small}>
      {Object.entries(colors)
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
                keywords={[name, name + shade, `${name} ${shade}`, `${name}-${shade}`]}
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
