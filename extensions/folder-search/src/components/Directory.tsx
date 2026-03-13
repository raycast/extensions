import { Action, ActionPanel, Icon, List, popToRoot, Color } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import path from "path";
import { useEffect, useState } from "react";
import fs from "fs";
import { folderName, log } from "../utils";
import { SpotlightSearchResult } from "../types";
import { useFolderSearch } from "../hooks/useFolderSearch";

interface DirectoryProps {
  path: string;
  onReturn?: () => void;
}

function createSpotlightResult(filePath: string): SpotlightSearchResult {
  try {
    const stats = fs.statSync(filePath);
    return {
      path: filePath,
      kMDItemFSName: path.basename(filePath),
      kMDItemKind: "Folder",
      kMDItemFSSize: stats.size,
      kMDItemFSCreationDate: stats.birthtime.toISOString(),
      kMDItemContentModificationDate: stats.mtime.toISOString(),
      kMDItemLastUsedDate: stats.atime.toISOString(),
      kMDItemUseCount: 0,
    };
  } catch {
    // Provide fallback for errors
    return {
      path: filePath,
      kMDItemFSName: path.basename(filePath),
      kMDItemKind: "Folder",
      kMDItemFSSize: 0,
      kMDItemFSCreationDate: new Date().toISOString(),
      kMDItemContentModificationDate: new Date().toISOString(),
      kMDItemLastUsedDate: new Date().toISOString(),
      kMDItemUseCount: 0,
    };
  }
}

// Get the parent directory, ensuring we never go beyond root
function safeParentDirectory(directoryPath: string): string {
  const parent = path.dirname(directoryPath);
  // Ensure we don't try to go above root
  return parent === directoryPath ? "/" : parent;
}

export function Directory({ path: directoryPath, onReturn }: DirectoryProps) {
  const [files, setFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get pin functionality from useFolderSearch hook
  const { resultIsPinned, toggleResultPinnedStatus } = useFolderSearch();

  // Handle return to main view with callback
  const handleReturn = () => {
    if (onReturn) {
      const timestamp = new Date().toISOString().slice(11, 23);
      log("debug", "Directory", `[${timestamp}] Running return callback for ${directoryPath}`);
      onReturn();
    } else {
      log("debug", "Directory", `No return callback provided for ${directoryPath}`);
    }
  };

  // Function that toggles pins and calls onReturn afterward
  const handleTogglePin = (result: SpotlightSearchResult) => {
    const timestamp = new Date().toISOString().slice(11, 23);
    const action = resultIsPinned(result) ? "Unpinning" : "Pinning";
    log("debug", "Directory", `[${timestamp}] ${action} folder: ${result.path}`);

    // Toggle the pin status
    toggleResultPinnedStatus(result);

    // Add a delay to ensure the pin toggle has completed
    setTimeout(() => {
      // Always trigger return callback after pin action
      log("debug", "Directory", `[${timestamp}+50ms] Calling handleReturn after pin toggle`);
      handleReturn();
    }, 50);
  };

  useEffect(() => {
    try {
      const items = fs
        .readdirSync(directoryPath)
        .filter((file) => !file.startsWith("."))
        .filter((file) => {
          try {
            return fs.statSync(path.join(directoryPath, file)).isDirectory();
          } catch {
            return false; // Skip files we can't stat
          }
        })
        .sort();
      setFiles(items);
    } catch (error) {
      showFailureToast(error, { title: "Error reading directory" });
      log("error", "Directory", "Error reading directory", { error, path: directoryPath });
    } finally {
      setIsLoading(false);
    }
  }, [directoryPath]);

  return (
    <List isLoading={isLoading}>
      <List.Section title={`Contents of ${path.basename(directoryPath)}`}>
        {/* Add parent directory navigation option */}
        {directoryPath !== "/" && (
          <List.Item
            key="parent-dir"
            title=".."
            subtitle="Parent Directory"
            icon={Icon.ArrowUp}
            accessories={(() => {
              const parentPath = safeParentDirectory(directoryPath);
              const parentResult = createSpotlightResult(parentPath);
              return resultIsPinned(parentResult) ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow } }] : [];
            })()}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Go to Parent Directory"
                  icon={Icon.ArrowUp}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                  target={<Directory path={safeParentDirectory(directoryPath)} onReturn={onReturn} />}
                />
                {/* Add Pin/Unpin action for parent directory */}
                {(() => {
                  const parentPath = safeParentDirectory(directoryPath);
                  const parentResult = createSpotlightResult(parentPath);

                  return (
                    <Action
                      title={!resultIsPinned(parentResult) ? "Pin Parent Folder" : "Unpin Parent Folder"}
                      icon={!resultIsPinned(parentResult) ? Icon.Star : Icon.StarDisabled}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                      onAction={() => {
                        handleTogglePin(parentResult);
                      }}
                    />
                  );
                })()}
              </ActionPanel>
            }
          />
        )}

        {files.map((file) => {
          const filePath = path.join(directoryPath, file);
          const result = createSpotlightResult(filePath);

          return (
            <List.Item
              key={filePath}
              title={file}
              icon={{ fileIcon: filePath }}
              accessories={resultIsPinned(result) ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow } }] : []}
              actions={
                <ActionPanel title={folderName(result)}>
                  <Action.Open
                    title="Open in Finder"
                    icon={Icon.Folder}
                    target={filePath}
                    onOpen={() => {
                      handleReturn();
                      popToRoot({ clearSearchBar: true });
                    }}
                  />
                  <Action.OpenWith
                    title="Open with…"
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    path={filePath}
                    onOpen={() => {
                      handleReturn();
                      popToRoot({ clearSearchBar: true });
                    }}
                  />
                  {/* Add Pin/Unpin action */}
                  <Action
                    title={!resultIsPinned(result) ? "Pin" : "Unpin"}
                    icon={!resultIsPinned(result) ? Icon.Star : Icon.StarDisabled}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                    onAction={() => {
                      handleTogglePin(result);
                    }}
                  />
                  <ActionPanel.Section>
                    <Action.Push
                      title="Enclosing Folder"
                      icon={Icon.ArrowUp}
                      shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                      target={<Directory path={safeParentDirectory(filePath)} onReturn={onReturn} />}
                    />
                    <Action.Push
                      title="Enter Folder"
                      icon={Icon.ArrowDown}
                      shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                      target={<Directory path={filePath} onReturn={onReturn} />}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
