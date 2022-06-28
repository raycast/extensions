import { useState, useMemo } from "react";
import { ActionPanel, Action, Grid, environment } from "@raycast/api";
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
  const [itemSize, setItemSize] = useState<Grid.ItemSize>(Grid.ItemSize.Medium);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <Grid
      itemSize={itemSize}
      inset={Grid.Inset.Large}
      isLoading={isLoading}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Grid Item Size"
          storeValue
          onChange={(newValue) => {
            setItemSize(newValue as Grid.ItemSize);
            setIsLoading(false);
          }}
        >
          <Grid.Dropdown.Item title="Large" value={Grid.ItemSize.Large} />
          <Grid.Dropdown.Item title="Medium" value={Grid.ItemSize.Medium} />
          <Grid.Dropdown.Item title="Small" value={Grid.ItemSize.Small} />
        </Grid.Dropdown>
      }
    >
      {!isLoading &&
        files.map(([path, name]) => (
          <Grid.Item
            key={name}
            content={path}
            title={name}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://lucide.dev/icon/${name}`} />
                <Action.CopyToClipboard content={name} title="Copy Name to Clipboard" />
                <Action.CopyToClipboard content={readFileSync(path, "utf8")} title="Copy SVG to Clipboard" />
                <Action.CopyToClipboard content={`<${toPascalCase(name)} />`} title="Copy Component to Clipboard" />
              </ActionPanel>
            }
          />
        ))}
    </Grid>
  );
}
