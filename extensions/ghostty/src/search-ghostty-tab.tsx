import { useState } from "react";
import { Action, ActionPanel, closeMainWindow, Icon, List, popToRoot } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";

import { runAppleScript } from "./utils/applescript";

type TabInfo = { windowIndex: number; tabIndex: number; name: string };

const fetchTabsScript = `
tell application "Ghostty"
  if (count of windows) is 0 then
    return "Error: Ghostty has no windows"
  end if
  set output to ""
  repeat with w from 1 to count of windows
    set winRef to window w
    repeat with t from 1 to count of tabs of winRef
      set tabName to name of tab t of winRef
      if tabName is missing value or tabName is "" then
        set tabName to "Tab " & t
      end if
      if length of output is greater than 0 then
        set output to output & "::REC::"
      end if
      set output to output & w & "::" & t & "::" & tabName
    end repeat
  end repeat
  return output
end tell
`;

const focusTabScript = (windowIndex: number, tabIndex: number) => `
  tell application "Ghostty"
    activate
    set targetTab to tab ${tabIndex} of window ${windowIndex}
    set targetWindow to window ${windowIndex}
    select tab targetTab
    activate window targetWindow
    focus (focused terminal of targetTab)
  end tell
`;

async function fetchTabs(): Promise<TabInfo[]> {
  try {
    const result = await runAppleScript(fetchTabsScript);
    if (result.startsWith("Error:")) {
      return [];
    }
    const lines = result.split("::REC::").filter(Boolean);
    return lines.map((line) => {
      const parts = line.split("::");
      const w = parts[0] ?? "1";
      const t = parts[1] ?? "1";
      const name = parts.slice(2).join("::").trim() || "Untitled";
      return {
        windowIndex: parseInt(w, 10),
        tabIndex: parseInt(t, 10),
        name,
      };
    });
  } catch (error) {
    showFailureToast(error, {
      title: "Error",
      message: "Error fetching tabs. Ensure Ghostty is running and AppleScript is enabled.",
    });
    return [];
  }
}

async function focusTab(tab: TabInfo) {
  try {
    await runAppleScript(focusTabScript(tab.windowIndex, tab.tabIndex));
  } catch (error) {
    await showFailureToast(error, {
      title: "Error",
      message: "Error focusing tab.",
    });
  }
}

export default function SearchGhosttyTabs() {
  const [searchText, setSearchText] = useState("");
  const { data: tabs, isLoading } = usePromise(fetchTabs);
  const filteredTabs = tabs?.filter((tab) => tab.name.toLowerCase().includes(searchText.toLowerCase()));

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Ghostty Tabs"
      searchBarPlaceholder="Search tabs..."
    >
      {filteredTabs?.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Terminal}
          title="No tabs found"
          description="Open Ghostty and create some tabs, or ensure AppleScript is enabled (macos-applescript = true)."
        />
      ) : null}
      {filteredTabs?.map((tab, index) => (
        <List.Item
          key={`${tab.windowIndex}-${tab.tabIndex}-${index}`}
          title={tab.name}
          icon={Icon.Window}
          actions={
            <ActionPanel>
              <Action
                title="Select Tab"
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onAction={async () => {
                  await focusTab(tab);
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
