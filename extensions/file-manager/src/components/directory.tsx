import fs from "node:fs";
import { Action, ActionPanel, Detail, getPreferenceValues, List } from "@raycast/api";
import { useState } from "react";
import { execSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { getDirectoryData, createItem, getStartDirectory, iCloudDrivePath, escapeShellArg } from "../utils";
import { FileDataType } from "../types";
import parser, { GitIgnoreHelper } from "@gerhobbelt/gitignore-parser";

export function Directory(props: { path: string; ignores: GitIgnoreHelper[]; initial?: boolean }) {
  // somehow, sometimes props.path is null
  if (props.path === null || !fs.existsSync(props.path)) {
    return <Detail markdown={`# Error: \n\nThe directory \`${props.path}\` does not exist. `} />;
  }

  // copy to avoid mutating the parent's array across renders
  const ignores = [...props.ignores];
  const preferences = getPreferenceValues<Preferences>();

  // .gitignore
  if (preferences.respectGitignore) {
    if (fs.existsSync(`${props.path}/.gitignore`)) {
      ignores.push(parser.compile(fs.readFileSync(`${props.path}/.gitignore`, "utf8")));
    }

    // ~.config/git/ignore
    if (props.initial) {
      if (fs.existsSync(`${homedir()}/.config/git/ignore`)) {
        ignores.push(parser.compile(fs.readFileSync(`${homedir()}/.config/git/ignore`, "utf8")));
      }
    }
  }

  // .rayignore
  if (preferences.respectRayignore) {
    if (fs.existsSync(`${props.path}/.rayignore`)) {
      ignores.push(parser.compile(fs.readFileSync(`${props.path}/.rayignore`, "utf8")));
    }
  }

  function getFilteredData(): FileDataType[] {
    const data = getDirectoryData(props.path);

    // apply ignore filters
    const filtered = data.filter((f) => {
      const path = f.name + (f.type === "directory" ? "/" : "");
      for (const ignore of ignores) {
        if (ignore.denies(path)) {
          return false;
        }
      }
      return true;
    });

    if (!preferences.showHiddenFiles && filtered.length > 0) {
      try {
        // use a single stat call
        const escapedPaths = filtered.map((f) => escapeShellArg(join(props.path, f.name)));
        const statOutput = execSync(`stat -f%f ${escapedPaths.join(" ")}`, { encoding: "utf8" });
        const flags = statOutput
          .trim()
          .split("\n")
          .map((line) => parseInt(line, 10));
        return filtered.filter((_, i) => !(flags[i] & (1 << 15)));
      } catch {
        return filtered;
      }
    }

    return filtered;
  }

  const [directoryData, setDirectoryData] = useState<FileDataType[]>(() => getFilteredData());

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
                  <Action.Push
                    title={
                      /* eslint-disable-next-line @raycast/prefer-title-case*/
                      "Open iCloud"
                    }
                    target={<Directory path={iCloudDrivePath()} ignores={ignores} />}
                  />
                </ActionPanel>
              }
            />
          </List.Section>
        )}
        <List.Section title="Directories">
          {directories.map((data) => createItem(data, () => setDirectoryData(getFilteredData()), preferences, ignores))}
        </List.Section>
        <List.Section title="Files">
          {nonDirectories.map((data) =>
            createItem(data, () => setDirectoryData(getFilteredData()), preferences, ignores),
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
                <Action.Push
                  title={
                    /* eslint-disable-next-line @raycast/prefer-title-case*/
                    "Open iCloud"
                  }
                  target={<Directory path={iCloudDrivePath()} ignores={ignores} />}
                />
              </ActionPanel>
            }
          />
        )}

        {directoryData.map((data) => createItem(data, () => setDirectoryData(getFilteredData()), preferences, ignores))}
      </List>
    );
  }
}
