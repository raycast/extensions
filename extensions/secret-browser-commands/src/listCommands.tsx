import { useState } from "react";
import { Action, ActionPanel, Icon, List, Color, getPreferenceValues } from "@raycast/api";
import { OpenInBrowserSubmenu } from "./components/OpenInActions";
import { browserCommands } from "./data/paths";
import { SUPPORTED_BROWSERS } from "./types/browsers";
import { openUrlInBrowser } from "./utils/openUrlInBrowser";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [showInternalDebugging, setShowInternalDebugging] = useState<"hide-debug" | "show-all" | "show-debug">(
    "hide-debug",
  );
  const commands = browserCommands;
  const { preferredBrowser } = getPreferenceValues<{ preferredBrowser: string }>();

  const getPreferredBrowser = () => {
    const defaultBrowserKey = "chrome";
    const browserKey = preferredBrowser || defaultBrowserKey;
    return (
      SUPPORTED_BROWSERS.find((b) => b.key === browserKey) ||
      SUPPORTED_BROWSERS.find((b) => b.key === defaultBrowserKey)!
    );
  };

  const filteredCommands = commands.filter((command) => {
    const description =
      typeof command.description === "function"
        ? command.description(getPreferredBrowser())
        : command.description || "";

    // Filter by search text
    const matchesSearch =
      command.name.toLowerCase().includes(searchText.toLowerCase()) ||
      command.path.toLowerCase().includes(searchText.toLowerCase()) ||
      description.toLowerCase().includes(searchText.toLowerCase());

    // Filter based on debug view mode
    const showBasedOnDebugging =
      showInternalDebugging === "show-all" ||
      (showInternalDebugging === "show-debug" && command.isInternalDebugging) ||
      (showInternalDebugging === "hide-debug" && !command.isInternalDebugging);

    return matchesSearch && showBasedOnDebugging;
  });

  const getFullUrlForDisplayAndSubmenu = (itemPath: string): string => {
    const browser = getPreferredBrowser();
    return `${browser.scheme}${itemPath}`;
  };

  return (
    <List
      isShowingDetail={true}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search commands..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Options"
          storeValue={true}
          value={showInternalDebugging}
          onChange={(value) => setShowInternalDebugging(value as "hide-debug" | "show-all" | "show-debug")}
        >
          <List.Dropdown.Item title="Show All" value="show-all" />
          <List.Dropdown.Item title="Hide Debug Commands" value="hide-debug" />
          <List.Dropdown.Item title="Show Debug Commands Only" value="show-debug" />
        </List.Dropdown>
      }
    >
      {filteredCommands.map((command) => (
        <List.Item
          key={command.id}
          title={command.name}
          subtitle={command.path}
          icon={
            command.isInternalDebugging
              ? { source: Icon.Bug, tintColor: Color.Orange }
              : { source: Icon.Globe, tintColor: Color.Blue }
          }
          detail={
            <List.Item.Detail
              markdown={`# ${command.name}\n\n${
                typeof command.description === "function"
                  ? command.description(getPreferredBrowser())
                  : command.description || "No description available."
              }`}
            />
          }
          actions={
            <ActionPanel title={command.name}>
              <Action
                title={`Open in ${getPreferredBrowser().title}`}
                icon={Icon.Globe}
                onAction={() => {
                  const browser = getPreferredBrowser();
                  openUrlInBrowser(browser.appName!, `${browser.scheme}${command.path}`);
                }}
              />
              <OpenInBrowserSubmenu commandPath={command.path} preferences={{ preferredBrowser }} />
              <Action.CopyToClipboard
                title="Copy URL"
                content={getFullUrlForDisplayAndSubmenu(command.path)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
