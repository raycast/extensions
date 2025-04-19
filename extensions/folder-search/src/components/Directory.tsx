import { Action, ActionPanel, Icon, List, popToRoot } from "@raycast/api";
import path from "node:path";
import { useEffect, useState } from "react";
import fs from "fs";
import { folderName, log } from "../utils";
import { SpotlightSearchResult } from "../types";

interface DirectoryProps {
  path: string;
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
  } catch (error) {
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

export function Directory({ path: directoryPath }: DirectoryProps) {
  const [files, setFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const items = fs
        .readdirSync(directoryPath)
        .filter((file) => !file.startsWith("."))
        .filter((file) => {
          try {
            return fs.statSync(path.join(directoryPath, file)).isDirectory();
          } catch (e) {
            return false; // Skip files we can't stat
          }
        })
        .sort();
      setFiles(items);
    } catch (error) {
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
            actions={
              <ActionPanel>
                <Action.Push
                  title="Go to Parent Directory"
                  icon={Icon.ArrowUp}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                  target={<Directory path={safeParentDirectory(directoryPath)} />}
                />
              </ActionPanel>
            }
          />
        )}

        {files.map((file, index) => {
          const filePath = path.join(directoryPath, file);
          const result = createSpotlightResult(filePath);
          return (
            <List.Item
              key={index + 1} // Offset by 1 to account for parent dir item
              title={file}
              icon={{ fileIcon: filePath }}
              actions={
                <ActionPanel title={folderName(result)}>
                  <Action.Open
                    title="Open in Finder"
                    icon={Icon.Folder}
                    target={filePath}
                    onOpen={() => popToRoot({ clearSearchBar: true })}
                  />
                  <Action.OpenWith
                    title="Open With…"
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    path={filePath}
                    onOpen={() => popToRoot({ clearSearchBar: true })}
                  />
                  <ActionPanel.Section>
                    <Action.Push
                      title="Enclosing Folder"
                      icon={Icon.ArrowUp}
                      shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                      target={<Directory path={safeParentDirectory(filePath)} />}
                    />
                    <Action.Push
                      title="Enter Folder"
                      icon={Icon.ArrowDown}
                      shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                      target={<Directory path={filePath} />}
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
