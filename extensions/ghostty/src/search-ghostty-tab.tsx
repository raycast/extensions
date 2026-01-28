import { runAppleScript } from "run-applescript";
import { useState } from "react";
import { Action, ActionPanel, closeMainWindow, List, popToRoot } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";

export default function SearchGhosttyTabs() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading } = usePromise(fetchTabs);
  const filteredTabs = data?.tabs.filter((item) => item.includes(searchText));

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Ghostty Tabs"
      searchBarPlaceholder="Search..."
    >
      {filteredTabs?.map((item, index) => (
        <List.Item
          key={index}
          title={item}
          icon={"../assets/extension-icon.png"}
          actions={
            <ActionPanel>
              <Action
                title="Select"
                onAction={async () => {
                  await focusTab({ menuIndex: index + data!.offset + 1 });
                  await popToRoot();
                  await closeMainWindow();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

const fetchTabs = async () => {
  const script = `
      tell application "System Events"
        set isGhosttyRunning to exists (processes where name is "Ghostty")
      end tell

      tell application "Ghostty"
        if not isGhosttyRunning then
          return "Error: Ghostty is not running"
        end if
      end tell

      tell application "System Events"
        tell process "Ghostty"
          try

            set windowMenu to menu 1 of menu bar item 6 of menu bar 1
            set menuItems to name of menu items of windowMenu

            -- Find the last occurrence of "missing value", this is where the tabs are currently
            set lastMissingValueIndex to -1
            repeat with i from 1 to count menuItems
              if item i of menuItems is missing value then
                set lastMissingValueIndex to i
              end if
            end repeat

            -- Get all items after the last "missing value"
            if lastMissingValueIndex > 0 then
              set tabItems to items (lastMissingValueIndex + 1) through -1 of menuItems
            else
              set tabItems to {}
            end if

            -- Return the last menu items as a comma-separated string with the offset
            set AppleScript's text item delimiters to ","
            return lastMissingValueIndex & "::" & (tabItems as text)
          on error errMsg
            return "Error: " & errMsg
          end try
        end tell
      end tell
  `;

  try {
    const result = await runAppleScript(script);
    const [offset, tabs] = result.split("::,");
    const tabList = tabs.split(",").map((item) => item.trim());
    return { offset: parseInt(offset, 10), tabs: tabList };
  } catch (error) {
    showFailureToast(error, {
      title: "Error",
      message: "Error fetching tabs.",
    });
    return { offset: 0, tabs: [] };
  }
};

const focusTab = async ({ menuIndex }: { menuIndex: number }) => {
  const focusScript = `
    tell application "Ghostty"
      activate
      tell application "System Events"
        tell process "Ghostty"
          click menu item ${menuIndex} of menu 1 of menu bar item 6 of menu bar 1
        end tell
      end tell
    end tell
  `;
  try {
    await runAppleScript(focusScript);
  } catch (error) {
    await showFailureToast(error, {
      title: "Error",
      message: "Error focussing tab.",
    });
  }
};
