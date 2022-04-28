import { useEffect, useState } from "react";
import { ActionPanel, List, Action, Icon, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { existsSync } from "fs";
import { dirname, resolve } from "path";
import { homedir } from "os";
import { useDebounce } from "use-debounce";

import { FileInfo, Preferences } from "./types";
import { persistDb, queryFiles, useDb } from "./db";
import { displayPath, escapePath, fileMetadataMarkdown, walkRecursivelyAndSaveFiles } from "./utils";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const drivePath = resolve(preferences.googleDriveRootPath.trim().replace("~", homedir()));
  // const drivePath = `${homedir}/Downloads`;
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [debouncedSelectedFile] = useDebounce(selectedFile, 100);
  const [fileDetailsMarkup, setFileDetailsMarkup] = useState<string>("");
  const [isFetching, setIsFetching] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText] = useDebounce(searchText, 100);
  const [filesFiltered, setFilesFiltered] = useState<Array<FileInfo>>([]);
  const db = useDb();

  useEffect(() => {
    (async () => setFileDetailsMarkup(await fileMetadataMarkdown(debouncedSelectedFile)))();
  }, [debouncedSelectedFile]);

  useEffect(() => {
    if (!existsSync(drivePath)) {
      showToast({
        style: Toast.Style.Failure,
        title: `The specified Google Drive root path "${drivePath}" does not exist.`,
      });

      setIsFetching(false);
      return;
    }

    if (db) {
      try {
        walkRecursivelyAndSaveFiles(drivePath, db);
        persistDb(db);

        if (filesFiltered.length === 0) {
          setIsFetching(true);
          setFilesFiltered(queryFiles(db, ""));
        }
      } catch (e) {
        console.error(e);
        showToast({
          style: Toast.Style.Failure,
          title: "Error! Is Google Drive app running and accessible?",
          message: `Could not read files in "${displayPath(drivePath)}"`,
        });
      } finally {
        setIsFetching(false);
      }
    }
  }, [drivePath, db]);

  useEffect(() => {
    (async () => {
      if (!db) return;

      setIsFetching(true);
      setFilesFiltered(queryFiles(db, debouncedSearchText));
      setIsFetching(false);
    })();
  }, [debouncedSearchText]);

  const findFile = (displayPath?: string): FileInfo | null =>
    (displayPath && filesFiltered.find((file) => file.displayPath === displayPath)) || null;

  return (
    <List
      isShowingDetail={filesFiltered.length > 0}
      throttle
      enableFiltering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Search in ${displayPath(drivePath)}`}
      isLoading={isFetching}
      onSelectionChange={(id) => setSelectedFile(findFile(id))}
    >
      {filesFiltered.length > 0 ? (
        <List.Section title="Files">
          {filesFiltered.map((file) => (
            <List.Item
              id={file.displayPath}
              key={file.displayPath}
              icon={{ fileIcon: file.path }}
              title={file.name}
              detail={<List.Item.Detail markdown={fileDetailsMarkup} />}
              actions={
                <ActionPanel>
                  <Action.Open title="Open File" icon={Icon.Document} target={file.path} />
                  <Action.ShowInFinder path={file.path} />
                  <Action.OpenWith path={file.path} />
                  <Action.CopyToClipboard
                    title="Copy File Path"
                    content={escapePath(file.displayPath)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Folder Path"
                    content={escapePath(dirname(file.displayPath))}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView title={isFetching ? "Fetching files, please wait..." : "No files found"} />
      )}
    </List>
  );
}
