import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  type LaunchProps,
} from "@raycast/api";
import React, { useEffect, useState } from "react";
import { openInCursor } from "./utils/cursor";
import { addRecentProject } from "./utils/storage";
import * as fs from "fs";
import * as path from "path";
import { homedir } from "os";

interface Preferences {
  baseDirectory: string;
}

interface CommandArguments {
  folderName?: string;
}

interface DirectoryItem {
  name: string;
  path: string;
  isDirectory: boolean;
}

export default function Command({
  arguments: args,
}: LaunchProps<{ arguments: CommandArguments }>) {
  const preferences = getPreferenceValues<Preferences>();
  const [currentPath, setCurrentPath] = useState<string>("");
  const [directories, setDirectories] = useState<DirectoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleFolderNameArgument = async () => {
      if (args.folderName?.trim()) {
        setIsLoading(true);
        const baseDir = preferences.baseDirectory?.trim() || "C:\\git";
        const folderPath = path.join(baseDir, args.folderName.trim());

        try {
          if (fs.existsSync(folderPath)) {
            const stats = fs.statSync(folderPath);
            if (stats.isDirectory()) {
              await handleSelectFolder(folderPath);
              return;
            } else {
              await showToast({
                style: Toast.Style.Failure,
                title: "Not a Directory",
                message: `${folderPath} is not a directory`,
              });
            }
          } else {
            await showToast({
              style: Toast.Style.Failure,
              title: "Folder Not Found",
              message: `Folder "${args.folderName}" not found in ${baseDir}`,
            });
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Unknown error occurred";
          await showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: errorMessage,
          });
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    void handleFolderNameArgument();
  }, [args.folderName]);

  const navigateToDirectory = async (dirPath: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Normalize path
      const normalizedPath = path.normalize(dirPath);

      // Validate directory exists
      if (!fs.existsSync(normalizedPath)) {
        setError(`Directory does not exist: ${normalizedPath}`);
        setIsLoading(false);
        return;
      }

      // Check if it's actually a directory
      const stats = fs.statSync(normalizedPath);
      if (!stats.isDirectory()) {
        setError(`${normalizedPath} is not a directory`);
        setIsLoading(false);
        return;
      }

      // Read directory contents
      const entries = fs.readdirSync(normalizedPath, { withFileTypes: true });

      // Filter and sort directories
      const dirs: DirectoryItem[] = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({
          name: entry.name,
          path: path.join(normalizedPath, entry.name),
          isDirectory: true,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setDirectories(dirs);
      setCurrentPath(normalizedPath);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(`Failed to read directory: ${errorMessage}`);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const goUp = () => {
    const parentPath = path.dirname(currentPath);
    // Don't go above root (e.g., C:\)
    if (parentPath !== currentPath) {
      navigateToDirectory(parentPath);
    }
  };

  const handleSelectFolder = async (folderPath: string) => {
    try {
      // Add to recent projects
      await addRecentProject(folderPath);

      // Open in Cursor
      const success = await openInCursor(folderPath);
      if (success) {
        await showToast({
          style: Toast.Style.Success,
          title: "Opening Directory",
          message: `Opening "${path.basename(folderPath)}" in Cursor`,
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Open Directory",
        message: errorMessage,
      });
    }
  };

  const getQuickAccessDirectories = (): DirectoryItem[] => {
    const baseDir = preferences.baseDirectory?.trim() || "C:\\git";
    const quickAccess: DirectoryItem[] = [];

    // Read all folders from base directory
    if (fs.existsSync(baseDir)) {
      try {
        const stats = fs.statSync(baseDir);
        if (stats.isDirectory()) {
          const entries = fs.readdirSync(baseDir, { withFileTypes: true });
          const baseDirFolders = entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => ({
              name: entry.name,
              path: path.join(baseDir, entry.name),
              isDirectory: true,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

          quickAccess.push(...baseDirFolders);
        }
      } catch (err) {
        // If we can't read the base directory, return empty array
        console.error("Failed to read base directory:", err);
      }
    }

    return quickAccess;
  };

  // Get system drives for Windows
  const getSystemDrives = (): DirectoryItem[] => {
    const drives: DirectoryItem[] = [];
    // Windows drives: C:, D:, E:, etc.
    for (let i = 67; i <= 90; i++) {
      const driveLetter = String.fromCharCode(i);
      const drivePath = `${driveLetter}:\\`;
      if (fs.existsSync(drivePath)) {
        drives.push({
          name: `${driveLetter}: Drive`,
          path: drivePath,
          isDirectory: true,
        });
      }
    }
    return drives;
  };

  const quickAccess = getQuickAccessDirectories();
  const canGoUp = currentPath && path.dirname(currentPath) !== currentPath;

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Go to Home"
                icon={Icon.House}
                onAction={() => navigateToDirectory(homedir())}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Show selection view if no current path is set
  if (!currentPath) {
    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder="Browse folders to find a directory..."
        navigationTitle="Browse Directories"
      >
        {/* Quick Access Section - Base Directory Folders */}
        {quickAccess.length > 0 && (
          <>
            <List.Section
              title="Quick Access"
              subtitle={`Folders in ${preferences.baseDirectory?.trim() || "C:\\git"}`}
            >
              {quickAccess.map((dir) => (
                <List.Item
                  key={`quick-${dir.path}`}
                  icon={Icon.Folder}
                  title={dir.name}
                  subtitle={dir.path}
                  actions={
                    <ActionPanel>
                      <Action
                        icon={Icon.ArrowRight}
                        title="Open in Cursor"
                        onAction={() => handleSelectFolder(dir.path)}
                      />
                      <Action
                        icon={Icon.Folder}
                        title="Browse This Folder"
                        onAction={() => navigateToDirectory(dir.path)}
                        shortcut={{ modifiers: ["ctrl"], key: "enter" }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          </>
        )}

        {/* Common Directories Section */}
        <List.Section title="Common Directories">
          <List.Item
            icon={Icon.House}
            title="Home"
            subtitle={homedir()}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.ArrowRight}
                  title="Open in Cursor"
                  onAction={() => handleSelectFolder(homedir())}
                />
                <Action
                  icon={Icon.Folder}
                  title="Browse This Folder"
                  onAction={() => navigateToDirectory(homedir())}
                  shortcut={{ modifiers: ["ctrl"], key: "enter" }}
                />
              </ActionPanel>
            }
          />
          {preferences.baseDirectory?.trim() && (
            <List.Item
              icon={Icon.Folder}
              title={`Base Directory (${path.basename(preferences.baseDirectory.trim())})`}
              subtitle={preferences.baseDirectory.trim()}
              actions={
                <ActionPanel>
                  <Action
                    icon={Icon.ArrowRight}
                    title="Open in Cursor"
                    onAction={() =>
                      handleSelectFolder(preferences.baseDirectory.trim())
                    }
                  />
                  <Action
                    icon={Icon.Folder}
                    title="Browse This Folder"
                    onAction={() =>
                      navigateToDirectory(preferences.baseDirectory.trim())
                    }
                    shortcut={{ modifiers: ["ctrl"], key: "enter" }}
                  />
                </ActionPanel>
              }
            />
          )}
        </List.Section>

        {/* System Drives Section - Lower Priority */}
        {(() => {
          const systemDrives = getSystemDrives();
          return systemDrives.length > 0 ? (
            <List.Section
              title="Browse System"
              subtitle="Navigate to any directory on your system"
            >
              {systemDrives.map((drive) => (
                <List.Item
                  key={`drive-${drive.path}`}
                  icon={Icon.HardDrive}
                  title={drive.name}
                  subtitle={drive.path}
                  actions={
                    <ActionPanel>
                      <Action
                        icon={Icon.ArrowRight}
                        title="Open in Cursor"
                        onAction={() => handleSelectFolder(drive.path)}
                      />
                      <Action
                        icon={Icon.Folder}
                        title="Browse This Drive"
                        onAction={() => navigateToDirectory(drive.path)}
                        shortcut={{ modifiers: ["ctrl"], key: "enter" }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          ) : null;
        })()}

        {quickAccess.length === 0 && (
          <List.EmptyView
            icon={Icon.Folder}
            title="No Folders Found"
            description={`No folders found in base directory: ${preferences.baseDirectory?.trim() || "C:\\git"}`}
          />
        )}
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Browse folders in ${currentPath || "..."}`}
      navigationTitle={currentPath || "Select Directory"}
    >
      {/* Go Up Action */}
      {canGoUp && (
        <List.Item
          icon={Icon.ArrowUp}
          title=".."
          subtitle={`Go up to ${path.dirname(currentPath)}`}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.ArrowUp}
                title="Go Up"
                onAction={goUp}
                shortcut={{ modifiers: [], key: "backspace" }}
              />
            </ActionPanel>
          }
        />
      )}

      {/* Current Directory Contents */}
      {directories.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Folder}
          title="No Folders"
          description="This directory is empty or contains no subdirectories"
          actions={
            <ActionPanel>
              {canGoUp && (
                <Action
                  icon={Icon.ArrowUp}
                  title="Go Up"
                  onAction={goUp}
                  shortcut={{ modifiers: [], key: "backspace" }}
                />
              )}
              <Action
                icon={Icon.Checkmark}
                title="Select This Folder"
                onAction={() => handleSelectFolder(currentPath)}
              />
            </ActionPanel>
          }
        />
      )}

      {directories.map((dir) => (
        <List.Item
          key={dir.path}
          icon={Icon.Folder}
          title={dir.name}
          subtitle={dir.path}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.ArrowRight}
                title="Open in Cursor"
                onAction={() => handleSelectFolder(dir.path)}
              />
              <Action
                icon={Icon.Folder}
                title="Browse This Folder"
                onAction={() => navigateToDirectory(dir.path)}
                shortcut={{ modifiers: ["ctrl"], key: "enter" }}
              />
              <Action
                icon={Icon.Checkmark}
                title="Select This Folder"
                onAction={() => handleSelectFolder(currentPath)}
              />
              {canGoUp && (
                <Action
                  icon={Icon.ArrowUp}
                  title="Go Up"
                  onAction={goUp}
                  shortcut={{ modifiers: [], key: "backspace" }}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
