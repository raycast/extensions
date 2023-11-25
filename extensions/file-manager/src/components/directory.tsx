import fs from "node:fs";
import { Detail, getPreferenceValues, List } from "@raycast/api";
import { useState } from "react";
import { getDirectoryData, createItem } from "../utils";
import { FileDataType } from "../types";

export function Directory(props: { path: string }) {
  // somehow, sometimes props.path is null
  if (props.path === null || !fs.existsSync(props.path)) {
    return <Detail markdown={`# Error: \n\nThe directory \`${props.path}\` does not exist. `} />;
  }
  const [directoryData, setDirectoryData] = useState<FileDataType[]>(() => getDirectoryData(props.path));
  const preferences = getPreferenceValues<Preferences>();

  if (preferences.directoriesFirst) {
    const directories = directoryData.filter((file) => file.type === "directory");
    const nonDirectories = directoryData.filter((file) => file.type !== "directory");
    return (
      <List searchBarPlaceholder={`Search in ${props.path}/`}>
        <List.Section title="Directories">
          {directories.map((data) =>
            createItem(data, () => setDirectoryData(getDirectoryData(props.path)), preferences),
          )}
        </List.Section>
        <List.Section title="Files">
          {nonDirectories.map((data) =>
            createItem(data, () => setDirectoryData(getDirectoryData(props.path)), preferences),
          )}
        </List.Section>
      </List>
    );
  } else {
    return (
      <List searchBarPlaceholder={`Search in ${props.path}/`}>
        {directoryData.map((data) =>
          createItem(data, () => setDirectoryData(getDirectoryData(props.path)), preferences),
        )}
      </List>
    );
  }
}
