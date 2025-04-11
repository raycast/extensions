import fs from "node:fs";
import { Action, ActionPanel, Detail, getPreferenceValues, List } from "@raycast/api";
import { useState } from "react";
import { execSync } from "child_process";
import { getDirectoryData, createItem, getStartDirectory, iCloudDrivePath, escapeShellArg } from "../utils";
import { FileDataType } from "../types";
import parser, { GitIgnoreHelper } from "@gerhobbelt/gitignore-parser";

export function Directory(props: { path: string; ignores: GitIgnoreHelper[]; initial?: boolean }) {
  // somehow, sometimes props.path is null
  if (props.path === null || !fs.existsSync(props.path)) {
    return <Detail markdown={`# Error: \n\nThe directory \`${props.path}\` does not exist. `} />;
  }

  const ignores = props.ignores;
  const preferences = getPreferenceValues<Preferences>();

  const [directoryData, setDirectoryData] = useState<FileDataType[]>(() => {
    // .gitignore
    if (preferences.respectGitignore) {
      if (fs.existsSync(`${props.path}/.gitignore`)) {
        ignores.push(parser.compile(fs.readFileSync(`${props.path}/.gitignore`, "utf8")));
      }

      // ~.config/git/ignore
      if (props.initial) {
        if (fs.existsSync(`${getStartDirectory()}/.config/git/ignore`)) {
          ignores.push(parser.compile(fs.readFileSync(`${getStartDirectory()}/.config/git/ignore`, "utf8")));
        }
      }
    }

    // .rayignore
    if (preferences.respectRayignore) {
      if (fs.existsSync(`${props.path}/.rayignore`)) {
        ignores.push(parser.compile(fs.readFileSync(`${props.path}/.rayignore`, "utf8")));
      }
    }

    const data = getDirectoryData(props.path);

    return data.filter((f) => {
      const path = f.name + (f.type === "directory" ? "/" : "");
      for (const ignore of props.ignores) {
        if (ignore.denies(path)) {
          return false;
        }
      }
      if (!preferences.showHiddenFiles) {
        const fullPath = `${props.path}/${f.name}`;
        const escapedPath = escapeShellArg(fullPath);
        const statOutput = execSync(`stat -f%f ${escapedPath}`, {
          encoding: "utf8",
        }).trim();
        const fileFlags = parseInt(statOutput, 10);

        if (fileFlags & (1 << 15)) {
          return false;
        }
      }
      return true;
    });
  });

  if (preferences.directoriesFirst) {
    const directories = directoryData.filter((file) => file.type === "directory");
    const nonDirectories = directoryData.filter((file) => file.type !== "directory");
    return (
      <List searchBarPlaceholder={`Search in ${props.path}/`}>
        {props.path === getStartDirectory() && preferences.showiCloudDrive && (
          <List.Section title="iCloud Drive">
            <List.Item
              title="iCloud Drive"
              icon={{ source: "icloud.png" }}
              actions={
                <ActionPanel>
                  <Action.Push title="Open iCloud" target={<Directory path={iCloudDrivePath()} ignores={ignores} />} />
                </ActionPanel>
              }
            />
          </List.Section>
        )}
        <List.Section title="Directories">
          {directories.map((data) =>
            createItem(data, () => setDirectoryData(getDirectoryData(props.path)), preferences, ignores),
          )}
        </List.Section>
        <List.Section title="Files">
          {nonDirectories.map((data) =>
            createItem(data, () => setDirectoryData(getDirectoryData(props.path)), preferences, ignores),
          )}
        </List.Section>
      </List>
    );
  } else {
    return (
      <List searchBarPlaceholder={`Search in ${props.path}/`}>
        {props.path === getStartDirectory() && preferences.showiCloudDrive && (
          <List.Item
            title="iCloud Drive"
            icon={{ source: "icloud.png" }}
            actions={
              <ActionPanel>
                <Action.Push title="Open iCloud" target={<Directory path={iCloudDrivePath()} ignores={ignores} />} />
              </ActionPanel>
            }
          />
        )}

        {directoryData.map((data) =>
          createItem(data, () => setDirectoryData(getDirectoryData(props.path)), preferences, ignores),
        )}
      </List>
    );
  }
}
