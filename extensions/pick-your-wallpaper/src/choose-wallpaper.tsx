import React, { useState, useEffect } from "react";
import fs from "fs";
import path from "path";
import { Preferences } from "./types/preferences";
import { applyWallpaperUpdate, isValidFile } from "./utils";
import { Action, ActionPanel, Grid, Icon, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { File } from "./types/file";
import { promisify } from "util";

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const preferences = getPreferenceValues<Preferences>();

const wallpaperDir = preferences.wallpaperFolder;

async function getWallpapers(directoryPath: string = wallpaperDir): Promise<File[]> {
  let result: File[] = [];

  const files = await readdir(directoryPath);
  for (const file of files) {
    const newFile = {
      name: file,
      path: path.join(directoryPath, file),
    };
    const fileStats = await stat(newFile.path);

    if (fileStats.isDirectory()) {
      const subDirFiles = await getWallpapers(newFile.path);
      result = result.concat(subDirFiles);
    } else {
      if (isValidFile(newFile)) {
        result.push(newFile);
      }
    }
  }

  return result;
}

const wallpaperFiles = getWallpapers();

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filteredList, setFilteredList] = useState<File[]>([]);

  useEffect(() => {
    getWallpapers().then(setFilteredList);
  }, []);

  useEffect(() => {
    setFilteredList((files) => files.filter((file) => file.name.toLowerCase().includes(searchText.toLowerCase())));
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
          content={{ source: file.path }}
          actions={
            <ActionPanel>
              <Action title="Set as Wallpaper" icon={Icon.Desktop} onAction={() => applyWallpaperUpdate(file.path)} />
              <Action.ShowInFinder path={file.path} />
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
