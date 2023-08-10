// This Works
import React, { useState, useEffect } from "react";
import fs from "fs";
import path from "path";
import { Preferences } from "./types/preferences";
import { runAppleScriptSilently } from "./utils";
import { Action, ActionPanel, Grid, Icon, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { File } from "./types/file";

const preferences = getPreferenceValues<Preferences>();

const wallpaperDir = preferences.wallpaperFolder;

function getWallpapers(directoryPath: string = wallpaperDir): File[] {
  let result: File[] = [];

  fs.readdirSync(directoryPath).forEach((file) => {
    const newFile = {
      name: file,
      path: path.join(directoryPath, file),
    };
    const fileStats = fs.statSync(newFile.path);

    if (fileStats.isDirectory()) {
      result = result.concat(getWallpapers(newFile.path));
    } else {
      const extname = path.extname(file);
      if (
        extname === ".jpg" ||
        extname === ".jpeg" ||
        extname === ".png" ||
        extname === ".gif" ||
        extname === ".heic"
      ) {
        result.push(newFile);
      }
    }
  });

  return result;
}

const wallpaperFiles = getWallpapers();

export function applyWallpaperUpdate(file: string) {
  return `tell application "System Events"
            tell appearance preferences
              tell application "System Events"
                tell every desktop
                  set picture to "${file}"
                end tell
              end tell
            end tell
          end tell`;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filteredList, setFilteredList] = useState(wallpaperFiles);

  useEffect(() => {
    setFilteredList(wallpaperFiles.filter((file) => file.name.includes(searchText)));
  }, [searchText]);

  const columnCount = {
    small: 7,
    medium: 5,
    large: 3,
  }[preferences.displaySize];

  return (
    <Grid
      columns={columnCount}
      fit={Grid.Fit.Fill}
      aspectRatio={"16/9"}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for wallpapers"
    >
      <Grid.EmptyView icon={Icon.Image} title={"No wallpapers found. Add some images."} />
      {filteredList.map((file) => (
        <Grid.Item
          key={file.path}
          title={preferences.showTitle ? file.name.split(".")[0].replace(/[-_]/g, " ") : ""}
          content={{ source: `${file.path}` }}
          actions={
            <ActionPanel>
              <Action
                title="Set as Wallpaper"
                icon={Icon.Desktop}
                onAction={() => runAppleScriptSilently(applyWallpaperUpdate(file.path))}
              />
              <Action.ShowInFinder path={`${file}`} />
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
