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
} from "@raycast/api";
import fs from "fs";
import { useState } from "react";
import { formatDateTime, replaceDatePlaceholders } from "./utils/FormatDateTime";
import path from "path";

interface Preferences {
  directory: string;
  format: string;
  prefix: string;
  timeFormat: string;
  template: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { directory, format, prefix, timeFormat, template } = preferences;
  const dateTimeFormat = timeFormat === "12" && !prefix.includes("A") ? prefix + "A " : prefix;
  const timestamp = formatDateTime(new Date(), dateTimeFormat, timeFormat === "12");
  const filePath = path.join(directory, formatDateTime(new Date(), format));
  const memo = formatDateTime(new Date(), timestamp, timeFormat === "12");

  let memoContent = memo;
  const templateContent = !template ? "" : fs.readFileSync(template, "utf8");
  memoContent = replaceDatePlaceholders(new Date(), templateContent);

  // Create file if it doesn't exist
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, memoContent);
  }

  const fileContent = fs.readFileSync(filePath, "utf-8");
  const prefixPattern = buildPrefixRegex(timeFormat, prefix);
  const [searchText, setSearchText] = useState("");
  const [bulletPoints, setBulletPoints] = useState(getBulletPoints(fileContent, prefixPattern));

  // Update file content with new content
  const updateFileContent = (newContent: string) => {
    fs.writeFileSync(filePath, newContent);
    setBulletPoints(getBulletPoints(newContent, prefixPattern));
    setSearchText("");
    showToast(Toast.Style.Success, "Memo Saved");
  };

  // Insert new bullet point at the top or bottom of the file
  const appendBulletPoint = () => {
    if (searchText.trim() === "") return;

    const newBulletPoint = `${timestamp}${searchText}`;
    const currentContent = fs.readFileSync(filePath, "utf-8");
    const updatedContent = `${currentContent}${newBulletPoint}\n`;

    updateFileContent(updatedContent);
  };

  // Delete bullet point at the specified index
  const deleteMemo = async (index: number) => {
    const isConfirmed = await confirmAlert({
      title: "Confirm Deletion",
      message: "Are you sure you want to delete this memo?",
      primaryAction: {
        title: "Delete",
      },
    });

    if (isConfirmed) {
      // Filter lines that start with the user-defined prefix
      const originalBulletPoints = fileContent.split("\n").filter((line) => prefixPattern.test(line));
      const actualIndex = originalBulletPoints.length - 1 - index;
      if (actualIndex < 0 || actualIndex >= originalBulletPoints.length) {
        showToast(Toast.Style.Failure, "Error: Invalid index");
        return;
      }

      originalBulletPoints.splice(actualIndex, 1);
      const currentContent = fs.readFileSync(filePath, "utf-8");
      const updatedContent = originalBulletPoints.join("\n");
      const removeBulletPoints = currentContent
        .split("\n")
        .filter((line) => !prefixPattern.test(line))
        .join("\n");
      const appendUpdatedContent = removeBulletPoints + updatedContent + "\n";
      updateFileContent(appendUpdatedContent);
      showToast(Toast.Style.Success, "Memo Deleted");
    }
  };

  // Filter bullet points based on search text
  const filteredBulletPoints = bulletPoints.filter((point: string) =>
    point.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <List
      searchBarPlaceholder="Search or Add to Daily Note"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        searchText.trim() ? (
          <ActionPanel>
            <Action title="Add to Daily Note" icon={Icon.PlusCircle} onAction={() => appendBulletPoint()} />
          </ActionPanel>
        ) : undefined
      }
    >
      {filteredBulletPoints.length > 0
        ? filteredBulletPoints.map((point, index) => (
            <List.Item
              key={index}
              title={point.replace(/^- /, "")}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Details"
                    icon={Icon.Circle}
                    target={<Detail markdown={point.replace(/^- /, "")} />}
                  />
                  <Action
                    title="Delete Memo"
                    icon={Icon.MinusCircle}
                    style={Action.Style.Destructive}
                    onAction={() => deleteMemo(index)}
                  />
                  <Action.Open title="Open File" target={filePath} />
                </ActionPanel>
              }
            />
          ))
        : searchText.trim() && (
            <List.Item
              title="Add to Daily Note"
              actions={
                <ActionPanel>
                  <Action title="Add to Daily Note" icon={Icon.PlusCircle} onAction={() => appendBulletPoint()} />
                </ActionPanel>
              }
            />
          )}
    </List>
  );
}

// Helper function to get bullet points from file content
function getBulletPoints(content: string, prefixPattern: RegExp) {
  const lines = content.split("\n").filter((line) => prefixPattern.test(line));
  return lines.reverse(); // Display Daily Note in reverse order.
}

// Helper function to escape regex special characters
function escapeRegExp(string: string) {
  return string.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

// Helper function to build regex from user prefix
function buildPrefixRegex(timeFormat: string, userPrefix: string) {
  // Escape special characters
  let regexString = escapeRegExp(userPrefix);

  if (timeFormat === "12") {
    regexString = regexString
      .replace(/HH/g, "(0[1-9]|1[0-2])")
      .replace(/mm/g, "[0-5][0-9]")
      .replace(/ss/g, "[0-5][0-9]")
      .replace(/A/g, "(AM|PM)");
  } else {
    regexString = regexString.replace(/HH/g, "\\d{2}").replace(/mm/g, "\\d{2}").replace(/ss/g, "\\d{2}");
  }

  return new RegExp(`^${regexString}`);
}
