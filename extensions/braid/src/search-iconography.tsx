import { Action, ActionPanel, Grid, Keyboard } from "@raycast/api";
import fs from "fs";
import path from "path";
import localIconMap from "./resources/icon-map.json";

const getIconDataString = (svgContent: string) => `data:image/svg+xml;base64,${btoa(svgContent)}`;

export default function Command() {
  return (
    <Grid columns={8} inset={Grid.Inset.Large} searchBarPlaceholder="Search Braid Iconography">
      {localIconMap.map((item) => {
        const svgContentLight = fs.readFileSync(path.join(__dirname, item.svgPath.light), "utf-8");
        const svgContentDark = fs.readFileSync(path.join(__dirname, item.svgPath.dark), "utf-8");

        return (
          <Grid.Item
            key={item.url}
            content={{
              value: { source: { light: getIconDataString(svgContentLight), dark: getIconDataString(svgContentDark) } },
              tooltip: item.displayName,
            }}
            keywords={item.keywords}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} />
                <Action.CopyToClipboard
                  title="Copy Icon JSX"
                  content={`<${item.name} />`}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
