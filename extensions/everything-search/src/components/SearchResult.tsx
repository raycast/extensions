import { Action, Icon, List } from "@raycast/api";
import { basename, dirname } from "path";
import { useCallback, useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { FileInfo, Preferences } from "../types";
import { formatBytes, truncatePath } from "../utils/file";
import { loadFilesList } from "../services/fileOperations";
import { FileActionPanel } from "./FileActionPanel";
import { FileDetailMetadata } from "./FileDetailMetadata";
import { DirectoryBrowser } from "./DirectoryBrowser";

interface SearchResultProps {
  preferences: Preferences;
  searchText: string;
  onSearchTextChange: (text: string) => void;
}

export function SearchResult({ preferences, searchText, onSearchTextChange }: SearchResultProps) {
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const minChars: number = Number(preferences?.minCharsToSearch) || 3;

  const { data: searchResults = [], isLoading } = useCachedPromise(
    (text: string, prefs: Preferences | null): Promise<FileInfo[]> => {
      if (!prefs || text.length < minChars) return Promise.resolve([]);
      return loadFilesList(text, prefs);
    },
    [searchText, preferences],
    { initialData: [] as FileInfo[] },
  );

  const onSelectionChange = useCallback(
    (itemId: string | null) => {
      if (!itemId) {
        setSelectedFile(null);
        return;
      }
      const fileInfo = searchResults.find((f: FileInfo) => f.commandline === itemId) || null;
      setSelectedFile(fileInfo);
    },
    [searchResults],
  );

  const onToggleDetails = useCallback(() => setIsShowingDetail((d) => !d), []);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder="Search Files with Everything..."
      onSearchTextChange={onSearchTextChange}
      onSelectionChange={onSelectionChange}
      throttle
    >
      <List.EmptyView
        title={
          searchText.length > 0 && searchText.length < minChars
            ? "Keep typing..."
            : searchText
              ? "No Files Found"
              : "Search for Anything"
        }
        description={
          searchText.length > 0 && searchText.length < minChars
            ? `The search will start after you type at least ${minChars} characters.`
            : searchText
              ? `No results for "${searchText}"`
              : "Start typing to search your entire system with Everything."
        }
        icon={Icon.MagnifyingGlass}
      />
      {searchResults.map((file) => (
        <List.Item
          key={file.commandline}
          id={file.commandline}
          title={file.name}
          subtitle={isShowingDetail ? basename(dirname(file.commandline)) : truncatePath(dirname(file.commandline))}
          icon={{ fileIcon: file.commandline }}
          accessories={[{ text: file.isDirectory ? "Folder" : formatBytes(file.size || 0) }]}
          actions={
            <FileActionPanel file={file} preferences={preferences} onToggleDetails={onToggleDetails}>
              {dirname(file.commandline) !== file.commandline && (
                <Action.Push
                  title="Navigate Up"
                  icon={Icon.ArrowUp}
                  target={
                    <DirectoryBrowser
                      directoryPath={dirname(file.commandline)}
                      preferences={preferences}
                      previousDir={file.commandline}
                      isShowingDetail={isShowingDetail}
                      onToggleDetails={onToggleDetails}
                    />
                  }
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "arrowUp" },
                    windows: { modifiers: ["ctrl", "shift"], key: "arrowUp" },
                  }}
                />
              )}
              {file.isDirectory && (
                <Action.Push
                  title="Navigate Down"
                  icon={Icon.ArrowDown}
                  target={
                    <DirectoryBrowser
                      directoryPath={file.commandline}
                      preferences={preferences}
                      previousDir={dirname(file.commandline)}
                      isShowingDetail={isShowingDetail}
                      onToggleDetails={onToggleDetails}
                    />
                  }
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "arrowDown" },
                    windows: { modifiers: ["ctrl", "shift"], key: "arrowDown" },
                  }}
                />
              )}
            </FileActionPanel>
          }
          detail={
            isShowingDetail && (
              <FileDetailMetadata file={selectedFile?.commandline === file.commandline ? selectedFile : file} />
            )
          }
        />
      ))}
    </List>
  );
}
