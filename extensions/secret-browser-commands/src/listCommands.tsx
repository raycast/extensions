import { useState } from "react";
import { Action, ActionPanel, Icon, List, Color, showToast, Toast } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { OpenInBrowserSubmenu } from "./components/OpenInActions";
import { browserCommands } from "./data/paths";
import { SUPPORTED_BROWSERS, BROWSER_CHROME } from "./types/browsers";
import { openUrlInBrowser } from "./utils/openUrlInBrowser";
import { Platform } from "./types/types";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const {
    value: selectedBrowser = "chrome",
    setValue: setSelectedBrowser,
    isLoading,
  } = useLocalStorage<string>("selected-browser", "chrome");

  const getCurrentBrowser = () => {
    const browser = SUPPORTED_BROWSERS.find((b) => b.key === selectedBrowser);
    return browser || BROWSER_CHROME;
  };

  const getCurrentPlatform = (): Platform => {
    // Detect platform from process.platform (Node.js environment)
    // darwin = macOS, win32 = Windows, linux = Linux
    const platform = process.platform;
    if (platform === "darwin") return "mac";
    if (platform === "win32") return "windows";
    return "linux";
  };

  const filteredCommands = browserCommands.filter((command) => {
    const description =
      typeof command.description === "function" ? command.description(getCurrentBrowser()) : command.description || "";

    // Filter by search text
    const matchesSearch =
      command.name.toLowerCase().includes(searchText.toLowerCase()) ||
      command.path.toLowerCase().includes(searchText.toLowerCase()) ||
      description.toLowerCase().includes(searchText.toLowerCase());

    // Filter by browser compatibility
    const isBrowserCompatible = command.supportedBrowsers.includes(selectedBrowser);

    // Filter by platform compatibility
    const userPlatform = getCurrentPlatform();
    const isPlatformCompatible =
      (!command.platforms || command.platforms.includes(userPlatform)) &&
      (!command.excludedPlatforms || !command.excludedPlatforms.includes(userPlatform));

    return matchesSearch && isBrowserCompatible && isPlatformCompatible;
  });

  const getFullUrlForDisplayAndSubmenu = (itemPath: string): string => {
    const browser = getCurrentBrowser();
    return `${browser.scheme}${itemPath}`;
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={true}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search commands..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Browser"
          storeValue={true}
          value={selectedBrowser}
          onChange={(value) => setSelectedBrowser(value)}
        >
          {SUPPORTED_BROWSERS.map((browser) => (
            <List.Dropdown.Item key={browser.key} title={browser.title} value={browser.key} />
          ))}
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
                  ? command.description(getCurrentBrowser())
                  : command.description || "No description available."
              }`}
            />
          }
          actions={
            <ActionPanel title={command.name}>
              <Action
                title={`Open in ${getCurrentBrowser().title}`}
                icon={Icon.Globe}
                onAction={async () => {
                  const browser = getCurrentBrowser();
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
              <OpenInBrowserSubmenu commandPath={command.path} currentBrowser={selectedBrowser} />
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
