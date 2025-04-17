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
}

export function Directory({ path: directoryPath }: DirectoryProps) {
  const [files, setFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const items = fs
        .readdirSync(directoryPath)
        .filter((file) => !file.startsWith("."))
        .filter((file) => fs.statSync(path.join(directoryPath, file)).isDirectory())
        .sort();
      setFiles(items);
    } catch (error) {
      log("error", "Directory", "Error reading directory", { error });
    } finally {
      setIsLoading(false);
    }
  }, [directoryPath]);

  return (
    <List isLoading={isLoading}>
      <List.Section title={`Contents of ${path.basename(directoryPath)}`}>
        {files.map((file, index) => {
          const filePath = path.join(directoryPath, file);
          const result = createSpotlightResult(filePath);
          return (
            <List.Item
              key={index}
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
                      target={<Directory path={path.dirname(filePath)} />}
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
