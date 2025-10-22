import { useState } from "react";
import { Action, ActionPanel, Icon, List, Color, showToast, Toast } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { OpenInBrowserSubmenu } from "./components/OpenInActions";
import { browserCommands } from "./data/paths";
import { SUPPORTED_BROWSERS, BROWSER_CHROME } from "./types/browsers";
import { openUrlInBrowser } from "./utils/openUrlInBrowser";
import { Platform } from "./types/types";

// Default starred command IDs
const DEFAULT_STARRED_COMMANDS = ["extensions", "bookmarks", "downloads", "whats-new", "flags"];

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const {
    value: selectedBrowser = "chrome",
    setValue: setSelectedBrowser,
    isLoading,
  } = useLocalStorage<string>("selected-browser", "chrome");
  const {
    value: starredCommands = DEFAULT_STARRED_COMMANDS,
    setValue: setStarredCommands,
    isLoading: isStarredLoading,
  } = useLocalStorage<string[]>("starred-commands", DEFAULT_STARRED_COMMANDS);

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

  const toggleStar = (commandId: string) => {
    if (starredCommands.includes(commandId)) {
      setStarredCommands(starredCommands.filter((id) => id !== commandId));
    } else {
      setStarredCommands([...starredCommands, commandId]);
    }
  };

  const filteredCommands = browserCommands
    .filter((command) => {
      const description =
        typeof command.description === "function"
          ? command.description(getCurrentBrowser())
          : command.description || "";

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
    })
    .sort((a, b) => {
      // Sort starred items to the top
      const aIsStarred = starredCommands.includes(a.id);
      const bIsStarred = starredCommands.includes(b.id);
      if (aIsStarred && !bIsStarred) return -1;
      if (!aIsStarred && bIsStarred) return 1;
      // Otherwise maintain original order
      return 0;
    });

  const getFullUrlForDisplayAndSubmenu = (itemPath: string): string => {
    // If the path already contains a scheme (like chrome-untrusted://), return it as-is
    if (itemPath.includes("://")) {
      return itemPath;
    }
    const browser = getCurrentBrowser();
    // Use displayScheme if available (e.g., atlas:// for Atlas), otherwise use scheme
    const displayScheme = browser.displayScheme || browser.scheme;
    return `${displayScheme}${itemPath}`;
  };

  const getPlatformDisplayName = (platform: Platform): string => {
    const platformNames: Record<Platform, string> = {
      windows: "Windows",
      mac: "macOS",
      linux: "Linux",
    };
    return platformNames[platform];
  };

  const getBrowserDisplayNames = (browserKeys: string[]): string => {
    return browserKeys
      .map((key) => {
        const browser = SUPPORTED_BROWSERS.find((b) => b.key === key);
        return browser?.title || key;
      })
      .join(", ");
  };

  return (
    <List
      isLoading={isLoading || isStarredLoading}
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
      {filteredCommands.map((command) => {
        const isStarred = starredCommands.includes(command.id);
        const description =
          typeof command.description === "function"
            ? command.description(getCurrentBrowser())
            : command.description || "No description available.";
        const fullUrl = getFullUrlForDisplayAndSubmenu(command.path);

        return (
          <List.Item
            key={`${command.id}-${selectedBrowser}`}
            title={command.name}
            subtitle={command.path}
            icon={
              command.isInternalDebugging
                ? { source: Icon.Bug, tintColor: Color.Orange }
                : { source: Icon.Globe, tintColor: Color.Blue }
            }
            accessories={isStarred ? [{ icon: Icon.Star, tooltip: "Starred" }] : []}
            detail={
              <List.Item.Detail
                markdown={`# ${command.name}\n\n${description}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="URL" text={fullUrl} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Type"
                      text={command.isInternalDebugging ? "Debug/Internal" : "Standard"}
                      icon={
                        command.isInternalDebugging
                          ? { source: Icon.Bug, tintColor: Color.Orange }
                          : { source: Icon.Globe, tintColor: Color.Blue }
                      }
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Supported Browsers"
                      text={getBrowserDisplayNames(command.supportedBrowsers)}
                    />
                    {(command.platforms || command.excludedPlatforms) && (
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Platform Compatibility"
                          text={
                            command.platforms
                              ? command.platforms.map(getPlatformDisplayName).join(", ")
                              : command.excludedPlatforms
                                ? `All except ${command.excludedPlatforms.map(getPlatformDisplayName).join(", ")}`
                                : "All platforms"
                          }
                        />
                      </>
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Starred"
                      text={isStarred ? "Yes" : "No"}
                      icon={isStarred ? { source: Icon.Star, tintColor: Color.Green } : undefined}
                    />
                  </List.Item.Detail.Metadata>
                }
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
                <Action
                  title={isStarred ? "Unstar" : "Star"}
                  icon={isStarred ? Icon.StarDisabled : Icon.Star}
                  onAction={() => toggleStar(command.id)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                />
                <OpenInBrowserSubmenu commandPath={command.path} currentBrowser={selectedBrowser} />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={fullUrl}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
