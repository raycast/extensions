import { List, Icon, ListItem, ActionPanel, showToast, LaunchType, Clipboard, launchCommand } from "@raycast/api";
import { useState } from "react";
import fs from "fs";
import path from "path";
import { environment } from "@raycast/api";

launchCommand({ name: "menu", type: LaunchType.UserInitiated });

const REMEMBERING_FILE = path.join(environment.supportPath, "remembering.csv");

let fileExists = false;
try {
  fs.accessSync(REMEMBERING_FILE);
  fileExists = true;
} catch {
  console.log("File does not exist. Creating a new file...");
}

let content = "";
if (fileExists) {
  // Read the contents of the existing file
  content = fs.readFileSync(REMEMBERING_FILE, "utf-8");
}

// Split the CSV into lines
const lines = content.split("\n");

// Filter out empty lines
const nonEmptyLines = lines.filter((line) => line.trim() !== "");

// Join the remaining lines back together
const updatedCsv = nonEmptyLines.join("\n");

fs.writeFileSync(REMEMBERING_FILE, updatedCsv);

type RememberedItem = {
  expirationDate: Date;
  content: string;
};

function readRememberedItems(): RememberedItem[] {
  const now = new Date();

  try {
    const fileContents = fs.readFileSync(REMEMBERING_FILE, "utf8");
    const lines = fileContents.trim().split("\n");
    const validLines = lines.filter((line) => {
      const [dateString] = line.split(",");

      const expirationDate = new Date(dateString);
      return expirationDate > now;
    });
    const newFileContents = validLines.join("\n") + "\n\n";
    fs.writeFileSync(REMEMBERING_FILE, newFileContents);

    return validLines.map((line) => {
      const [dateString, testlol] = line.split(",");
      const delimiter = "||&|"; // Remove unnecessary escape characters
      const content = testlol.replace(delimiter, ",");
      return {
        expirationDate: new Date(dateString),
        content,
      };
    });
  } catch {
    return [];
  }
}

function filterValidItems(items: RememberedItem[], query: string): RememberedItem[] {
  const now = new Date();
  return items.filter((item) => {
    if (query.length === 0) {
      return item.expirationDate > now;
    } else {
      return item.expirationDate > now && item.content.toLowerCase().includes(query.toLowerCase());
    }
  });
}

function getExpirationString(expirationDate: Date): string {
  const now = new Date();
  const diff = expirationDate.getTime() - now.getTime();
  const year = 365 * 24 * 60 * 60 * 1000;
  const month = 30 * 24 * 60 * 60 * 1000;
  const day = 24 * 60 * 60 * 1000;
  const hour = 60 * 60 * 1000;
  const minute = 60 * 1000;
  const second = 1000;

  if (diff > 10 * year) {
    return "Forever";
  } else if (diff <= 0) {
    return "Expired";
  } else if (diff >= year) {
    const years = Math.floor(diff / year);
    const remaining = diff % year;
    const months = Math.floor(remaining / month);
    if (years === 1) {
      return `Expires in ${years} year and ${months} months`;
    } else {
      return `Expires in ${years} years and ${months} months`;
    }
  } else if (diff >= month) {
    const months = Math.floor(diff / month);
    const remaining = diff % month;
    const days = Math.floor(remaining / day);
    if (months === 1) {
      return `Expires in ${months} month and ${days} days`;
    } else {
      return `Expires in ${months} months and ${days} days`;
    }
  } else if (diff >= day) {
    const days = Math.floor(diff / day);
    const remaining = diff % day;
    const hours = Math.floor(remaining / hour);
    if (days === 1) {
      return `Expires in ${days} day and ${hours} hours`;
    } else {
      return `Expires in ${days} days and ${hours} hours`;
    }
  } else if (diff >= hour) {
    const hours = Math.floor(diff / hour);
    const remaining = diff % hour;
    const minutes = Math.floor(remaining / minute);
    if (hours === 1) {
      return `Expires in ${hours} hour and ${minutes} minutes`;
    } else {
      return `Expires in ${hours} hours and ${minutes} minutes`;
    }
  } else if (diff >= minute) {
    const minutes = Math.floor(diff / minute);
    const remaining = diff % minute;
    const seconds = Math.floor(remaining / second);
    if (minutes === 1) {
      return `Expires in ${minutes} minute and ${seconds} seconds`;
    } else {
      return `Expires in ${minutes} minutes and ${seconds} seconds`;
    }
  } else {
    const seconds = Math.floor(diff / second);
    return `Expires in ${seconds} seconds`;
  }
}

export default function Command() {
  const [items, setItems] = useState(filterValidItems(readRememberedItems(), ""));
  const [, setQuery] = useState("");

  const deleteItem = (index: number) => {
    const filePath = path.join(environment.supportPath, "remembering.csv");

    // Read the contents of the CSV file
    const fileContents = fs.readFileSync(filePath, "utf8");

    // Split the file contents into an array of lines
    const lines = fileContents.trim().split("\n");

    // Remove the line at the specified index
    lines.splice(index, 1);

    // Join the remaining lines back into a single string
    const newFileContents = lines.join("\n");

    // Write the updated contents back to the file
    fs.writeFileSync(filePath, newFileContents);

    // Update the state by filtering the items array to exclude the deleted item
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);

    showToast({ title: "Deleted That Item!" });
    launchCommand({ name: "menu", type: LaunchType.UserInitiated });
  };

  const handleSearch = (query: string) => {
    setQuery(query);
    setItems(filterValidItems(readRememberedItems(), query));
  };

  launchCommand({ name: "menu", type: LaunchType.UserInitiated });

  return (
    <List searchBarPlaceholder="Search remembered items" onSearchTextChange={handleSearch}>
      {items.length > 0 ? (
        items.map((item, index) => (
          <ListItem
            key={index}
            title={item.content}
            subtitle={getExpirationString(item.expirationDate)}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <ActionPanel.Item
                    title="Add Item"
                    icon={Icon.Document}
                    onAction={() => {
                      launchCommand({ name: "index", type: LaunchType.UserInitiated });
                    }}
                  />
                  <ActionPanel.Item
                    title="Copy Item"
                    icon={Icon.CopyClipboard}
                    onAction={() => {
                      Clipboard.copy(item.content);
                      showToast({ title: `Copied to "${item.content}" Clipboard!` });
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                  <ActionPanel.Item
                    title="Delete Item"
                    icon={Icon.DeleteDocument}
                    onAction={() => {
                      deleteItem(index);
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView
          icon={{ source: Icon.Stars }}
          title="Woohoo! You got nothing to do!"
          description="Click ⏎ to remember something!"
          actions={
            <ActionPanel>
              <ActionPanel.Item
                title="Add Item"
                icon={Icon.Plus}
                onAction={() => {
                  launchCommand({ name: "index", type: LaunchType.UserInitiated });
                }}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
