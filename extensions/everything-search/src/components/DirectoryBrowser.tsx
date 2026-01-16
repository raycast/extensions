import { Action, Icon, List, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { FileInfo, Preferences } from "../types";
import { loadDirectoryContents } from "../services/fileOperations";
import { useState, useCallback } from "react";
import { basename, dirname } from "path";
import { formatBytes } from "../utils/file";
import { FileActionPanel } from "./FileActionPanel";
import { FileDetailMetadata } from "./FileDetailMetadata";

interface DirectoryBrowserProps {
  directoryPath: string;
  preferences: Preferences;
  isShowingDetail: boolean;
  onToggleDetails: () => void;
  previousDir?: string;
}

export function DirectoryBrowser({
  directoryPath,
  preferences,
  isShowingDetail,
  onToggleDetails,
  previousDir,
}: DirectoryBrowserProps) {
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const { pop } = useNavigation();

  const { data: directoryContents = [], isLoading } = useCachedPromise(
    (path: string) => loadDirectoryContents(path),
    [directoryPath],
    { initialData: [] as FileInfo[] },
  );

  const onSelectionChange = useCallback(
    (itemId: string | null) => {
      if (!itemId) return;
      const fileInfo = directoryContents.find((file) => file.commandline === itemId) || null;
      setSelectedFile(fileInfo);
    },
    [directoryContents],
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      navigationTitle={`Browse: ${basename(directoryPath)}`}
      onSelectionChange={onSelectionChange}
    >
      <List.EmptyView
        title="Empty Directory"
        description={`No contents found in ${directoryPath}`}
        icon={Icon.Folder}
      />
      {directoryContents.map((item) => (
        <List.Item
          key={item.commandline}
          id={item.commandline}
          title={item.name}
          subtitle={isShowingDetail ? dirname(item.commandline) : undefined}
          icon={{ fileIcon: item.commandline }}
          accessories={[
            {
              text: item.isDirectory ? "Folder" : formatBytes(item.size || 0),
            },
          ]}
          actions={
            <FileActionPanel file={item} preferences={preferences} onToggleDetails={onToggleDetails}>
              {dirname(directoryPath) !== directoryPath &&
                (previousDir && dirname(directoryPath) === previousDir ? (
                  <Action
                    title="Navigate Up"
                    icon={Icon.ArrowUp}
                    onAction={() => pop()}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "arrowUp" },
                      windows: { modifiers: ["ctrl", "shift"], key: "arrowUp" },
                    }}
                  />
                ) : (
                  <Action.Push
                    title="Navigate Up"
                    icon={Icon.ArrowUp}
                    target={
                      <DirectoryBrowser
                        directoryPath={dirname(directoryPath)}
                        preferences={preferences}
                        isShowingDetail={isShowingDetail}
                        onToggleDetails={onToggleDetails}
                        previousDir={directoryPath}
                      />
                    }
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "arrowUp" },
                      windows: { modifiers: ["ctrl", "shift"], key: "arrowUp" },
                    }}
                  />
                ))}
              {item.isDirectory &&
                (previousDir && item.commandline === previousDir ? (
                  <Action
                    title="Navigate Down"
                    icon={Icon.ArrowDown}
                    onAction={() => pop()}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "arrowDown" },
                      windows: { modifiers: ["ctrl", "shift"], key: "arrowDown" },
                    }}
                  />
                ) : (
                  <Action.Push
                    title="Navigate Down"
                    icon={Icon.ArrowDown}
                    target={
                      <DirectoryBrowser
                        directoryPath={item.commandline}
                        preferences={preferences}
                        isShowingDetail={isShowingDetail}
                        onToggleDetails={onToggleDetails}
                        previousDir={directoryPath}
                      />
                    }
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "arrowDown" },
                      windows: { modifiers: ["ctrl", "shift"], key: "arrowDown" },
                    }}
                  />
                ))}
            </FileActionPanel>
          }
          detail={isShowingDetail && <FileDetailMetadata file={selectedFile || item} />}
        />
      ))}
    </List>
  );
}
