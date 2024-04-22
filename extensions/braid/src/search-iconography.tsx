import { Action, ActionPanel, Grid, Keyboard } from "@raycast/api";
import fs from "fs";
import path from "path";
import localIconMap from "./resources/icon-map.json";
import { useState } from "react";

const getIconDataString = (svgContent: string) => `data:image/svg+xml;base64,${btoa(svgContent)}`;

export default function Command() {
  const [selectedItem, setSelectedItem] = useState(localIconMap[0]);

  // This icon is not shown in the grid,
  // It is used as a fallback for current selected item when no results match
  const fallbackIcon = {
    name: "Error",
    displayName: "Error",
    url: "Error",
    keywords: [],
    svgPath: {
      light: "error",
      dark: "error",
    },
  };

  return (
    <Grid
      columns={8}
      inset={Grid.Inset.Large}
      searchBarPlaceholder="Search Braid Iconography"
      navigationTitle={
        selectedItem.name === "Error" ? "Search Iconography" : `Search Iconography - ${selectedItem.name}`
      }
      onSelectionChange={(itemId) => setSelectedItem(localIconMap.find((item) => item.url === itemId) || fallbackIcon)}
    >
      {localIconMap.map((item) => {
        const svgContentLight = fs.readFileSync(path.join(__dirname, item.svgPath.light), "utf-8");
        const svgContentDark = fs.readFileSync(path.join(__dirname, item.svgPath.dark), "utf-8");

        return (
          <Grid.Item
            id={item.url}
            key={item.url}
            content={{
              value: {
                source: {
                  light: getIconDataString(svgContentLight),
                  dark: getIconDataString(svgContentDark),
                },
              },
              tooltip: item.name,
            }}
            keywords={item.keywords}
            actions={
              <ActionPanel>
                <Action.Paste title="Paste Icon JSX" content={`<${item.name} />`} />
                <Action.CopyToClipboard
                  title="Copy Icon Name"
                  content={item.name}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action.OpenInBrowser url={item.url} shortcut={Keyboard.Shortcut.Common.Open} />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
