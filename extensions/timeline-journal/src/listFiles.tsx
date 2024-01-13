import { List, ActionPanel, Action, getPreferenceValues, Detail } from "@raycast/api";
import fs from "fs";
import path from "path";
import { useState } from "react";

interface ShowTimelineProps {
  filePath: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const folderPath = preferences.folderPath + "/";

  // Function to read files from a directory
  const readFiles = () => {
    try {
      return fs.readdirSync(folderPath).map((fileName) => ({
        name: fileName,
        path: path.join(folderPath, fileName),
      }));
    } catch (error) {
      console.error("Error reading files:", error);
      return [];
    }
  };

  const files = readFiles().reverse();

  return (
    <List searchBarPlaceholder="Search Timelines">
      {files.map((file) => (
        <List.Item
          key={file.path}
          title={file.name}
          actions={
            <ActionPanel>
              <Action.Push title="View Content" target={<ShowTimeline filePath={file.path} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ShowTimeline(props: ShowTimelineProps) {
  const fileContent = fs.readFileSync(props.filePath, "utf-8");
  const bulletPoints = fileContent
    .split("\n")
    .filter((line) => line.startsWith("- "))
    .reverse();
  const [searchText, setSearchText] = useState("");
  const filteredBulletPoints = bulletPoints.filter((point) => point.toLowerCase().includes(searchText.toLowerCase()));

  return (
    <List onSearchTextChange={setSearchText} throttle={true}>
      {filteredBulletPoints.map((point, index) => (
        <List.Item
          key={index}
          title={point.replace("- ", "")}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<Detail markdown={point.replace("- ", "")} />} />
              <Action.Open title="Open File" target={props.filePath} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
