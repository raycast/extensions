import { List, ActionPanel, Action, Detail, getPreferenceValues, showToast, Toast } from "@raycast/api";
import fs from "fs";
import { useState } from "react";
import { dateFormat, timeFormat } from "./utils/dateAndTime";

export default function Command() {
  const { folderPath, insertPosition } = getPreferenceValues<Preferences>();
  const filePath = `${folderPath}/${dateFormat()}.md`;

  // Create file if it doesn't exist
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "");
  }

  const fileContent = fs.readFileSync(filePath, "utf-8");
  const [searchText, setSearchText] = useState("");
  const [bulletPoints, setBulletPoints] = useState(getBulletPoints(fileContent, insertPosition));

  // Insert new bullet point at the top or bottom of the file
  const appendOrPrependBulletPoint = (operation: string | undefined) => {
    if (searchText.trim() === "") return;

    const formattedTime = timeFormat();
    const newBulletPoint = `- ${formattedTime} - ${searchText}`;
    const currentContent = fs.readFileSync(filePath, "utf-8");
    const updatedContent =
      operation === "append" ? `${currentContent}\n${newBulletPoint}` : `${newBulletPoint}\n${currentContent}`;

    updateFileContent(updatedContent);
  };

  const updateFileContent = (newContent: string | NodeJS.ArrayBufferView) => {
    fs.writeFileSync(filePath, newContent);
    setBulletPoints(getBulletPoints(newContent, insertPosition));
    setSearchText("");
  };

  // Delete bullet point at the specified index
  const deleteTimestamp = (index: number) => {
    const originalBulletPoints = fileContent.split("\n").filter((line) => line.startsWith("- "));
    const actualIndex = insertPosition === "append" ? originalBulletPoints.length - 1 - index : index;
    if (actualIndex < 0 || actualIndex >= originalBulletPoints.length) {
      showToast(Toast.Style.Failure, "Error: Invalid index");
      return;
    }

    originalBulletPoints.splice(actualIndex, 1);
    const updatedContent = originalBulletPoints.join("\n");
    updateFileContent(updatedContent);
    showToast(Toast.Style.Success, "Timestamp deleted");
  };

  // Filter bullet points based on search text
  const filteredBulletPoints = bulletPoints.filter((point: string) =>
    point.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <List
      searchBarPlaceholder="Search or Add to Timeline"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        searchText.trim() ? (
          <ActionPanel>
            <Action title="Add to Timeline" onAction={() => appendOrPrependBulletPoint(insertPosition)} />
          </ActionPanel>
        ) : undefined
      }
    >
      {filteredBulletPoints.length > 0
        ? filteredBulletPoints.map((point, index) => (
            <List.Item
              key={index}
              title={point.replace("- ", "")}
              actions={
                <ActionPanel>
                  <Action.Push title="Show Details" target={<Detail markdown={point.replace("- ", "")} />} />
                  <Action title="Delete Timestamp" onAction={() => deleteTimestamp(index)} />
                  <Action.Open title="Open File" target={filePath} />
                </ActionPanel>
              }
            />
          ))
        : searchText.trim() && (
            <List.Item
              title="Add to Timeline"
              actions={
                <ActionPanel>
                  <Action title="Add to Timeline" onAction={() => appendOrPrependBulletPoint(insertPosition)} />
                </ActionPanel>
              }
            />
          )}
    </List>
  );
}

// Helper function to get bullet points from file content
function getBulletPoints(content: string | NodeJS.ArrayBufferView, insertPosition: string | undefined) {
  const lines = (content as string).split("\n").filter((line: string) => line.startsWith("- "));
  return insertPosition === "append" ? lines.reverse() : lines;
}
