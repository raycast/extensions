import { List, Icon, ActionPanel, Action, environment, getPreferenceValues } from "@raycast/api";
import { ShortcutListItem } from "./components/ShortcutListItem";
import { HelpDetailView } from "./components/HelpDetailView";
import { useState, useEffect } from "react";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import UploadConfig from "./components/upload-config";

const execAsync = promisify(exec);

// Defines the structure of a shortcut item
interface ShortcutData {
  name: string; // Display name of the shortcut
  application: string; // Application the shortcut belongs to
  source: string; // Source of the shortcut (extension, builtin, etc.)
  type: string; // Type of shortcut
  key: string; // Unique identifier
  shortcut: string; // Actual shortcut combination
  control: boolean; // Whether Control key is used
  shift: boolean; // Whether Shift key is used
  option: boolean; // Whether Option key is used
  command: boolean; // Whether Command key is used
  keyCode: string; // Key code for the main key
  keyName: string; // Human-readable name of the key
}

// Result of loading shortcuts from disk
interface LoadResult {
  shortcuts: ShortcutData[];
  creationTime?: Date;
  error?: {
    type: "NO_DIRECTORY" | "NO_FILES" | "LOAD_ERROR";
    message: string;
  };
}

// Main component that displays the list of shortcuts
export default function Command() {
  // State management
  const [loadResult, setLoadResult] = useState<LoadResult>({ shortcuts: [] });
  const [showOnlyFocused, setShowOnlyFocused] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [focusedApp, setFocusedApp] = useState("");

  // Path where processed shortcut configs are stored
  const configPath = path.join(process.env.HOME || "", ".memorkeys", "processed_configs");

  // Gets the currently focused application using AppleScript
  const getFocusedApp = async () => {
    try {
      const script = 'tell application "System Events" to tell process 1 where frontmost is true to return name';
      const { stdout } = await execAsync(`osascript -e '${script}'`);
      const appName = stdout.trim();
      setFocusedApp(appName);
    } catch (error) {
      console.error("Error getting focused app:", error);
    }
  };

  // Toggles showing only shortcuts for the currently focused app
  const toggleShowOnlyFocused = async () => {
    const newValue = !showOnlyFocused;
    setShowOnlyFocused(newValue);
    if (newValue) {
      await getFocusedApp();
    }
  };

  // Loads shortcuts from the most recent config file
  const loadShortcuts = async () => {
    try {
      // Check if directory exists
      if (!fs.existsSync(configPath)) {
        return setLoadResult({
          shortcuts: [],
          error: {
            type: "NO_DIRECTORY",
            message: "No processed configs directory found.",
          },
        });
      }

      // Read all files in the directory
      const files = await fs.promises.readdir(configPath);
      const jsonFiles = files.filter((file) => file.endsWith(".json"));

      if (jsonFiles.length === 0) {
        return setLoadResult({
          shortcuts: [],
          error: {
            type: "NO_FILES",
            message: "No processed config files found.",
          },
        });
      }

      // Sort files by creation time and use the most recent
      const filePaths = jsonFiles.map((file) => ({
        name: file,
        path: path.join(configPath, file),
        ctime: fs.statSync(path.join(configPath, file)).ctime,
      }));

      filePaths.sort((a, b) => b.ctime.getTime() - a.ctime.getTime());

      // Read and parse the most recent file
      const mostRecentFile = filePaths[0];
      const fileContent = await fs.promises.readFile(mostRecentFile.path, "utf-8");
      const shortcuts = JSON.parse(fileContent);

      setLoadResult({ shortcuts, creationTime: mostRecentFile.ctime });
    } catch (error) {
      setLoadResult({
        shortcuts: [],
        error: {
          type: "LOAD_ERROR",
          message: error instanceof Error ? error.message : "Failed to load shortcuts",
        },
      });
    }
  };

  // Load shortcuts on component mount
  useEffect(() => {
    loadShortcuts();
  }, []);

  // Update focused app when needed
  useEffect(() => {
    if (showOnlyFocused) {
      getFocusedApp();
    }
  }, [showOnlyFocused]);

  // Update focused app when Raycast window is shown
  useEffect(() => {
    if (environment.launchType === "userInitiated" && showOnlyFocused) {
      getFocusedApp();
    }
  }, [environment.launchType]);

  // Filter shortcuts based on search and focused app
  const filteredShortcuts = loadResult.shortcuts.filter((shortcut) => {
    if (showOnlyFocused && shortcut.application.toLowerCase() !== focusedApp.toLowerCase()) {
      return false;
    }

    if (searchText) {
      const searchLower = searchText.toLowerCase();
      const preferences = getPreferenceValues();
      const searchFilter = showOnlyFocused ? "both" : preferences.searchFilter;

      switch (searchFilter) {
        case "apps":
          return shortcut.application.toLowerCase().includes(searchLower);
        case "shortcuts":
          return shortcut.name.toLowerCase().includes(searchLower);
        case "both":
        default:
          return (
            shortcut.name.toLowerCase().includes(searchLower) ||
            shortcut.application.toLowerCase().includes(searchLower)
          );
      }
    }

    return true;
  });

  // Update searchBarPlaceholder based on search filter
  const getSearchPlaceholder = () => {
    if (showOnlyFocused) {
      return `Search ${focusedApp} shortcuts...`;
    }

    const preferences = getPreferenceValues();
    switch (preferences.searchFilter) {
      case "apps":
        return "Search apps...";
      case "shortcuts":
        return "Search shortcuts...";
      case "both":
      default:
        return "Search shortcuts or apps...";
    }
  };

  // Reload everything (shortcuts and focused app if needed)
  const reloadEverything = async () => {
    if (showOnlyFocused) {
      await getFocusedApp();
    }
    await loadShortcuts();
  };

  // Get content for empty view states (no shortcuts, errors, etc.)
  const getEmptyViewContent = () => {
    if (!loadResult.error) {
      return {
        title: "No Matching Shortcuts",
        description: showOnlyFocused
          ? `No shortcuts found for ${focusedApp}, press ⌘ + r to reload shortcuts`
          : "Try adjusting your search or filters",
        actions: (
          <ActionPanel>
            <ActionPanel.Section title="Memorkeys">
              <Action
                title={showOnlyFocused ? "Show All Apps" : "Show Current App Only"}
                onAction={toggleShowOnlyFocused}
                icon={Icon.Filter}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
              />
            </ActionPanel.Section>

            <ActionPanel.Section title="Help">
              <Action
                title="Reload Shortcuts"
                icon={Icon.RotateClockwise}
                onAction={reloadEverything}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action.Push
                title="Open Upload Config"
                target={<UploadConfig />}
                icon={Icon.Upload}
                shortcut={{ modifiers: ["cmd"], key: "u" }}
              />
              <Action.ShowInFinder
                title="Open Configs Directory"
                path={configPath}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action.Push
                title="View Setup Instructions"
                target={<HelpDetailView configPath={configPath} />}
                icon={Icon.QuestionMark}
                shortcut={{ modifiers: ["cmd"], key: "h" }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        ),
      };
    }

    switch (loadResult.error.type) {
      case "NO_DIRECTORY":
      case "NO_FILES":
        return {
          title: "No Shortcuts Found",
          description: "View Setup Instructions to get started (⌘+H)",
          actions: (
            <ActionPanel>
              <ActionPanel.Section title="Help">
                <Action
                  title="Reload Shortcuts"
                  icon={Icon.RotateClockwise}
                  onAction={loadShortcuts}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action.Push
                  title="Open Upload Config"
                  target={<UploadConfig />}
                  icon={Icon.Upload}
                  shortcut={{ modifiers: ["cmd"], key: "u" }}
                />
                <Action.ShowInFinder
                  title="Open Configs Directory"
                  path={configPath}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action.Push
                  title="View Setup Instructions"
                  target={<HelpDetailView configPath={configPath} />}
                  icon={Icon.QuestionMark}
                  shortcut={{ modifiers: ["cmd"], key: "h" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          ),
        };
      case "LOAD_ERROR":
        return {
          title: "Error Loading Shortcuts",
          description: loadResult.error.message,
          actions: (
            <ActionPanel>
              <ActionPanel.Section title="Help">
                <Action
                  title="Reload Shortcuts"
                  icon={Icon.RotateClockwise}
                  onAction={loadShortcuts}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          ),
        };
      default:
        return {
          title: "No Shortcuts Found",
          description: "An unknown error occurred",
          actions: (
            <ActionPanel>
              <ActionPanel.Section title="Help">
                <Action
                  title="Reload Shortcuts"
                  icon={Icon.RotateClockwise}
                  onAction={loadShortcuts}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          ),
        };
    }
  };

  // Render the main list view
  return (
    <List
      isLoading={!loadResult.shortcuts.length && !loadResult.error}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={getSearchPlaceholder()}
      navigationTitle="Memorkeys"
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Memorkeys">
            <Action
              title={showOnlyFocused ? "Show All Apps" : "Show Current App Only"}
              onAction={toggleShowOnlyFocused}
              icon={Icon.Filter}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by App"
          value={showOnlyFocused ? "focused" : "all"}
          onChange={(value) => setShowOnlyFocused(value === "focused")}
        >
          <List.Dropdown.Item title="All Apps" value="all" />
          <List.Dropdown.Item title="Current App Only" value="focused" />
        </List.Dropdown>
      }
    >
      <List.EmptyView icon={Icon.QuestionMark} {...getEmptyViewContent()} />
      {filteredShortcuts.map((shortcut, index) => (
        <ShortcutListItem
          key={`${shortcut.application}-${shortcut.name}-${shortcut.shortcut}`}
          shortcut={shortcut}
          showOnlyFocused={showOnlyFocused}
          onToggleFocused={toggleShowOnlyFocused}
          onReload={showOnlyFocused ? reloadEverything : loadShortcuts}
          currentIndex={index}
          shortcuts={filteredShortcuts}
          creationTime={loadResult.creationTime}
        />
      ))}
    </List>
  );
}
