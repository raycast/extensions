import { List, Icon, ListItem, ActionPanel, showToast } from "@raycast/api";
import { useState } from "react";
import fs from "fs";
import path from "path";
import { environment } from "@raycast/api";

const REMEMBERING_FILE = path.join(environment.supportPath, "remembering.csv");

type RememberedItem = {
  expirationDate: Date;
  content: string;
};

function readRememberedItems(): RememberedItem[] {
  try {
    const data = fs.readFileSync(REMEMBERING_FILE, "utf8");
    const lines = data.split("\n").filter((line) => line.trim() !== "");
    return lines.map((line) => {
      const [dateString, content] = line.split(",");
      return {
        expirationDate: new Date(dateString),
        content,
      };
    });
  } catch (error) {
    return [];
  }
}

function filterValidItems(items: RememberedItem[]): RememberedItem[] {
  const now = new Date();
  return items.filter((item) => item.expirationDate > now);
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
  const [items, setItems] = useState(filterValidItems(readRememberedItems()));

  const deleteItem = (index: number) => {
    const filePath = path.join(environment.supportPath, "remembering.csv");

    // Read the contents of the CSV file
    const fileContents = fs.readFileSync(filePath, "utf8");

    // Split the file contents into an array of lines
    const lines = fileContents.trim().split("\n");

    // Remove the line at the specified index
    const deletedLine = lines.splice(index, 1)[0];

    // Join the remaining lines back into a single string
    const newFileContents = lines.join("\n");

    // Write the updated contents back to the file
    fs.writeFileSync(filePath, newFileContents);

    console.log(`Deleted line "${deletedLine}" at index ${index} from ${filePath}`);
    showToast({ title: "Deleted That!", message: `Run ⌘+r to refresh!` });
  };
  return (
    <List>
      {items.map((item, index) => (
        <ListItem
          key={index}
          title={item.content}
          subtitle={getExpirationString(item.expirationDate)}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
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
      ))}
    </List>
  );
}
