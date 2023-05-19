// This Works
import React, { useState, useEffect } from "react";
import fs from "fs";
import path from "path";
import { Preferences } from "./types/preferences";
import { runAppleScriptSilently } from "./utils";
import { Action, ActionPanel, Grid, Icon, getPreferenceValues, openExtensionPreferences } from "@raycast/api";

const preferences = getPreferenceValues<Preferences>();

const wallpaperDir = preferences.wallpaperFolder;

const wallpaperFilenames = fs.readdirSync(wallpaperDir).filter((filename) => {
  const extname = path.extname(filename);
  return extname === ".jpg" || extname === ".jpeg" || extname === ".png" || extname === ".gif";
});

export function applyWallpaperUpdate(filename: string) {
  return `tell application "System Events"
            tell appearance preferences
              tell application "System Events"
                tell every desktop
                  set picture to "${wallpaperDir}/${filename}"
                end tell
              end tell
            end tell
          end tell`;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState(wallpaperFilenames);

  useEffect(() => {
    filterList(wallpaperFilenames.filter((filename) => filename.includes(searchText)));
  }, [searchText]);

  return (
    <Grid
      columns={3}
      fit={Grid.Fit.Fill}
      aspectRatio={"16/9"}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for wallpapers"
    >
      <Grid.EmptyView icon={Icon.Image} title={"No wallpapers found. Add some images."} />
      {filteredList.map((filename) => (
        <Grid.Item
          key={filename}
          title={preferences.showTitle ? filename.split(".")[0].replace(/[-_]/g, " ") : ""}
          content={{ source: `${wallpaperDir}/${filename}` }}
          actions={
            <ActionPanel>
              <Action
                title="Set as Wallpaper"
                icon={Icon.Desktop}
                onAction={() => runAppleScriptSilently(applyWallpaperUpdate(filename))}
              />
              <Action.ShowInFinder path={`${wallpaperDir}/${filename}`} />
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={() => openExtensionPreferences()}
                shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
