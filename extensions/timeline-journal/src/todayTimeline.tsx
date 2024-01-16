import {
  List,
  ActionPanel,
  Action,
  Detail,
  getPreferenceValues,
  showToast,
  Toast,
  Icon,
  confirmAlert,
  Alert,
  Color,
} from "@raycast/api";
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
    showToast(Toast.Style.Success, "Added to Today's Timeline.");
  };

  // Delete bullet point at the specified index
  const deleteEntry = async (index: number) => {
    const isConfirmed = await confirmAlert({
      title: "Confirm Deletion",
      icon: { source: Icon.MinusCircle, tintColor: Color.Red },
      message: "Are you sure you want to delete this entry?",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (isConfirmed) {
      const originalBulletPoints = fileContent.split("\n").filter((line) => line.startsWith("- "));
      const actualIndex = insertPosition === "append" ? originalBulletPoints.length - 1 - index : index;
      if (actualIndex < 0 || actualIndex >= originalBulletPoints.length) {
        showToast(Toast.Style.Failure, "Error: Invalid index");
        return;
      }

      originalBulletPoints.splice(actualIndex, 1);
      const updatedContent = originalBulletPoints.join("\n");
      updateFileContent(updatedContent);
      showToast(Toast.Style.Success, "Entry Deleted.");
    }
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
            <Action
              title="Add to Timeline"
              icon={Icon.PlusCircle}
              onAction={() => appendOrPrependBulletPoint(insertPosition)}
            />
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
                  <Action.Push
                    title="Show Details"
                    icon={Icon.Circle}
                    target={<Detail markdown={point.replace("- ", "")} />}
                  />
                  <Action
                    title="Delete Entry"
                    icon={Icon.MinusCircle}
                    style={Action.Style.Destructive}
                    onAction={() => deleteEntry(index)}
                  />
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
                  <Action
                    title="Add to Timeline"
                    icon={Icon.PlusCircle}
                    onAction={() => appendOrPrependBulletPoint(insertPosition)}
                  />
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
