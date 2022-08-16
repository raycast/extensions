import { useState, useMemo } from "react";
import { ActionPanel, Action, Grid, environment, Color, Icon } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

// Lucide's toPascalCase function
export const toPascalCase = (string: string) => {
  const camelCase = string.replace(/^([A-Z])|[\s-_]+(\w)/g, (match, p1, p2) =>
    p2 ? p2.toUpperCase() : p1.toLowerCase()
  );

  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};

export default function Command() {
  const files = useMemo(
    () =>
      readdirSync(join(environment.assetsPath, "icons")).map((file) => [
        join(environment.assetsPath, "icons", file),
        file.split(".")[0],
      ]),
    []
  );
  const [color, setColor] = useCachedState<Color>("color", Color.PrimaryText);
  const [itemSize, setItemSize] = useCachedState<Grid.ItemSize>("size", Grid.ItemSize.Medium);

  return (
    <Grid itemSize={itemSize} inset={Grid.Inset.Large}>
      {files.map(([path, name]) => (
        <Grid.Item
          key={name}
          content={{ source: path, tintColor: color }}
          title={name}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://lucide.dev/icon/${name}`} />
              <Action.CopyToClipboard content={name} title="Copy Name to Clipboard" />
              <Action.CopyToClipboard content={readFileSync(path, "utf8")} title="Copy SVG to Clipboard" />
              <Action.CopyToClipboard content={`<${toPascalCase(name)} />`} title="Copy Component to Clipboard" />
              <ActionPanel.Section title="Preferences">
                <ActionPanel.Submenu title="Change Size…" icon={Icon.MagnifyingGlass}>
                  {Object.entries(Grid.ItemSize).map(([key, size]) => (
                    <Action key={size} title={key} onAction={() => setItemSize(size)} />
                  ))}
                </ActionPanel.Submenu>
                <ActionPanel.Submenu title="Change Color…" icon={Icon.EyeDropper}>
                  {Object.entries(Color).map(([key, color]) => (
                    <Action
                      key={color}
                      title={key}
                      icon={{ source: Icon.Circle, tintColor: color }}
                      onAction={() => setColor(color)}
                    />
                  ))}
                </ActionPanel.Submenu>
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
