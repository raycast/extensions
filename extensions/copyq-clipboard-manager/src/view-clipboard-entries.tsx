import {
  getPreferenceValues,
  List,
  Icon,
  ActionPanel,
  Action,
  Clipboard,
  Detail,
  openExtensionPreferences,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { execSync } from "child_process";

// Handle preferences
interface ExtensionPreferences {
  default_tab: string;
}

export default function Command() {
  // Fetch preferences
  const { default_tab } = getPreferenceValues<ExtensionPreferences>();
  const copyQPath = "/Applications/CopyQ.app/Contents/MacOS/CopyQ";

  // Error handling for missing CopyQ path and CopyQ not running
  try {
    execSync(`${copyQPath} tab`, { encoding: "utf8" });
  } catch (err) {
    return (
      <Detail
        markdown={
          "CopyQ not found, or CopyQ server not running\n\nPlease check that CopyQ is installed properly, and make sure CopyQ server is running."
        }
        actions={
          <ActionPanel>
            <Action title="Open Command Preferences" icon={Icon.Cog} onAction={openExtensionPreferences} />
            <Action.Paste title="Copy Path to Clipboard" content={copyQPath} />
          </ActionPanel>
        }
      />
    );
  }

  // State for selected tab and clipboard contents
  const [selectedTab, setSelectedTab] = useState(default_tab);
  const [clipboardContents, setClipboardContents] = useState<string[]>([]);

  // Get the list of tabs from CopyQ and return an array of text
  function getTabs(): string[] {
    const command = `"${copyQPath}" tab`;
    const stdout = execSync(command, { encoding: "utf8" });

    // Format list of tabs from string to array
    const lines = stdout.split("\n");
    const formattedList = lines.filter((line) => line.trim() !== "");
    // Remove & from items in the list
    const cleanedList = formattedList.map((item) => item.replace("&", ""));

    return cleanedList;
  }

  // Dropdown component for selecting a tab
  function TabDropdown() {
    const tabs = getTabs();
    return (
      <List.Dropdown
        tooltip="Select a Tab"
        defaultValue={default_tab}
        storeValue={false}
        placeholder="Search Tabs"
        onChange={(newTab) => setSelectedTab(newTab)}
      >
        {tabs.map((tab) => (
          <List.Dropdown.Item key={tab} title={tab} value={tab} />
        ))}
      </List.Dropdown>
    );
  }

  // Gets clipboard contents for a given tab and returns an array of text
  function getClipboardContents(tab: string) {
    const command = `${copyQPath} tab ${tab} 'separator(String.fromCharCode(0)); read.apply(this, [...Array(size()).keys()])'`;
    const stdout = execSync(command, { encoding: "utf8" });
    // Return the array split by null characters
    return stdout.split("\0");
  }

  // Selects clipboard content for a given tab and index
  function selectClipboardContents(tab: string, index: number) {
    const command = `${copyQPath} tab ${tab} select ${index}`;
    execSync(command);
  }

  // Effect to update clipboard contents when tab or maxEntries change
  useEffect(() => {
    const newClipboardContents = getClipboardContents(selectedTab);
    setClipboardContents(newClipboardContents);
  }, [selectedTab]);

  return (
    <List
      navigationTitle="Clipboard Manager"
      searchBarPlaceholder="Search Clipboard Contents"
      searchBarAccessory={<TabDropdown />}
      isShowingDetail={true}
    >
      {clipboardContents.map((text, index) => (
        <List.Item
          key={index}
          title={text}
          actions={
            <ActionPanel>
              <Action
                title="Paste"
                icon={Icon.Clipboard}
                onAction={() => {
                  selectClipboardContents(selectedTab, index);
                  Clipboard.paste({ text });
                }}
              />
              <Action.Push title="Preview" icon={Icon.Eye} target={<Detail markdown={text} />} />
            </ActionPanel>
          }
          detail={<List.Item.Detail markdown={text} />}
        />
      ))}
    </List>
  );
}
