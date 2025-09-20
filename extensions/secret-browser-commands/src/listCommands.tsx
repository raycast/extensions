import { useState } from "react";
import { Action, ActionPanel, Icon, List, Color, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { OpenInBrowserSubmenu } from "./components/OpenInActions";
import { browserCommands } from "./data/paths";
import { SUPPORTED_BROWSERS, BROWSER_CHROME } from "./types/browsers";
import { openUrlInBrowser } from "./utils/openUrlInBrowser";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [showInternalDebugging, setShowInternalDebugging] = useState<"hide-debug" | "show-all" | "show-debug">(
    "hide-debug",
  );
  const { preferredBrowser } = getPreferenceValues<Preferences>();

  const getPreferredBrowser = () => {
    const DEFAULT_BROWSER_KEY = "chrome";
    const browserKey = preferredBrowser || DEFAULT_BROWSER_KEY;

    // Try to find the preferred browser or fall back to the default browser
    const preferred = SUPPORTED_BROWSERS.find((b) => b.key === browserKey);
    if (preferred) return preferred;

    // Fall back to default browser if different from preferred
    if (browserKey !== DEFAULT_BROWSER_KEY) {
      const defaultBrowser = SUPPORTED_BROWSERS.find((b) => b.key === DEFAULT_BROWSER_KEY);
      if (defaultBrowser) return defaultBrowser;
    }

    // Last resort: return the first available browser or Chrome as fallback
    return SUPPORTED_BROWSERS[0] || BROWSER_CHROME;
  };

  const filteredCommands = browserCommands.filter((command) => {
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
                onAction={async () => {
                  const browser = getPreferredBrowser();
                  if (!browser.appName) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Browser Error",
                      message: `Could not determine application name for ${browser.title}`,
                    });
                    return;
                  }
                  await openUrlInBrowser(browser.appName, `${browser.scheme}${command.path}`);
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
