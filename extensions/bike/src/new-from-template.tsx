import { ActionPanel, List, Action, showHUD } from "@raycast/api";
import React from "react";
import { runAppleScript } from "run-applescript";
import checkBikeInstalled from "./index";

export default function main() {
  const error_alert = checkBikeInstalled();
  if (error_alert !== undefined) {
    return error_alert;
  }

  return (
    <List>
      <List.Item
        title="Daily Bike"
        actions={
          <ActionPanel>
            <Action
              title="Create Bike with Daily Note Template"
              onAction={() => {
                daily_bike();
              }}
            />
          </ActionPanel>
        }
      />

      <List.Item
        title="Cornell Note"
        actions={
          <ActionPanel>
            <Action
              title="Create Bike with Cornell Note Template"
              onAction={() => {
                cornell();
              }}
            />
          </ActionPanel>
        }
      />

      <List.Item
        title="Shopping List"
        actions={
          <ActionPanel>
            <Action
              title="Create Bike with Shopping List Template"
              onAction={() => {
                shopping_list();
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

async function daily_bike() {
  await runAppleScript(`tell application "Bike"
    activate
    set docName to (current date) as string
    set newDoc to make new document with properties {name: docName}

    try
      -- Attempt to delete every row (only works with license)
      tell newDoc to delete every row
    on error
      -- No license, just clear every row
      repeat with rowItem in rows of newDoc
        set name of rowItem to ""
      end repeat
    end try

    tell newDoc
      set startRow to make new row with properties {name: docName, level: 1}

      make new row with properties {name: "Today's Goals:", level: 2}
      make new row with properties {name: "1. ", level: 3}
      make new row with properties {name: "2. ", level: 3}
      make new row with properties {name: "3. ", level: 3}

      make new row with properties {name: "", level: 2}

      make new row with properties {name: "Today's Tasks:", level: 2}
      make new row with properties {name: "1. ", level: 3}
      make new row with properties {name: "2. ", level: 3}
      make new row with properties {name: "3. ", level: 3}

      make new row with properties {name: "", level: 2}

      make new row with properties {name: "Reminders:", level: 2}
      make new row with properties {name: "1. ", level: 3}
      make new row with properties {name: "2. ", level: 3}
      make new row with properties {name: "3. ", level: 3}

      make new row with properties {name: "", level: 2}

      make new row with properties {name: "Notes:", level: 2}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}
    end tell

    move startRow to front of rows of newDoc
  end tell`);
  showHUD("Created new Bike");
}

async function cornell() {
  await runAppleScript(`tell application "Bike"
    activate
    set docName to ((current date) as string) & " - Notes Summary"
    set newDoc to make new document with properties {name: docName}

    try
      -- Attempt to delete every row (only works with license)
      tell newDoc to delete every row
    on error
      -- No license, just clear every row
      repeat with rowItem in rows of newDoc
        set name of rowItem to ""
      end repeat
    end try

    tell newDoc
      set startRow to make new row with properties {name: docName, level: 1}

      make new row with properties {name: "Class/Subject: ", level: 2}
      make new row with properties {name: "Topic: ", level: 2}

      make new row with properties {name: "Notes", level: 2}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}

      make new row with properties {name: "", level: 2}

      make new row with properties {name: "Questions:", level: 2}
      make new row with properties {name: "1. ", level: 3}
      make new row with properties {name: "2. ", level: 3}
      make new row with properties {name: "3. ", level: 3}

      make new row with properties {name: "", level: 2}

      make new row with properties {name: "Summary:", level: 2}
      make new row with properties {name: "- ", level: 3}
    end tell

    move startRow to front of rows of newDoc
  end tell`);
  showHUD("Created new Bike");
}

async function shopping_list() {
  await runAppleScript(`tell application "Bike"
    activate
    set docName to ((current date) as string) & " - Shopping List"
    set newDoc to make new document with properties {name: docName}

    try
      -- Attempt to delete every row (only works with license)
      tell newDoc to delete every row
    on error
      -- No license, just clear every row
      repeat with rowItem in rows of newDoc
        set name of rowItem to ""
      end repeat
    end try

    tell newDoc
      set startRow to make new row with properties {name: docName, level: 1}

      make new row with properties {name: "Dairy:", level: 2}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}

      make new row with properties {name: "", level: 2}

      make new row with properties {name: "Fruits & Vegetables:", level: 2}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}

      make new row with properties {name: "", level: 2}

      make new row with properties {name: "Grains:", level: 2}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}

      make new row with properties {name: "", level: 2}

      make new row with properties {name: "Meats:", level: 2}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}

      make new row with properties {name: "", level: 2}

      make new row with properties {name: "Drinks:", level: 2}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}

      make new row with properties {name: "", level: 2}

      make new row with properties {name: "Frozen:", level: 2}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}

      make new row with properties {name: "", level: 2}

      make new row with properties {name: "Other:", level: 2}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}
    end tell

    move startRow to front of rows of newDoc
  end tell`);
  showHUD("Created new Bike");
}
