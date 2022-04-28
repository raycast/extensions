import { useCallback, useEffect, useState } from "react";
import { ActionPanel, List, Action, Icon, showToast, Toast } from "@raycast/api";
import { existsSync } from "fs";
import { dirname } from "path";
import { useDebounce } from "use-debounce";

import { FileInfo } from "./types";
import { buildCache, filesLastCachedAt, queryFiles, useDb } from "./db";
import { displayPath, escapePath, fileMetadataMarkdown, getDriveRootPath } from "./utils";

export default function Command() {
  const drivePath = getDriveRootPath();
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [debouncedSelectedFile] = useDebounce(selectedFile, 100);
  const [fileDetailsMarkup, setFileDetailsMarkup] = useState<string>("");
  const [isFetching, setIsFetching] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText] = useDebounce(searchText, 100);
  const [filesFiltered, setFilesFiltered] = useState<Array<FileInfo>>([]);
  const [filesCacheGeneratedAt, setFilesCacheGeneratedAt] = useState<Date | null>(null);
  const db = useDb();

  useEffect(() => {
    (async () => setFileDetailsMarkup(await fileMetadataMarkdown(debouncedSelectedFile)))();
  }, [debouncedSelectedFile]);

  useEffect(() => {
    (async () => {
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
          const isCached = await buildCache(drivePath, db);
          if (isCached) {
            setFilesCacheGeneratedAt(await filesLastCachedAt());
          }

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
    })();
  }, [drivePath, db]);

  useEffect(() => {
    (async () => {
      setFilesCacheGeneratedAt(await filesLastCachedAt());
    })();
  }, []);

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

  const forceRebuildCache = useCallback(async () => {
    if (!db) return;

    setIsFetching(true);
    setFilesFiltered([]);
    setSearchText("");
    showToast({ style: Toast.Style.Animated, title: "Rebuilding cache..." });
    buildCache(drivePath, db, { force: true }).then(async () => {
      setFilesCacheGeneratedAt(await filesLastCachedAt());
      setFilesFiltered(queryFiles(db, ""));
      showToast({ style: Toast.Style.Success, title: "Cache rebuild successfully! 🎉" });
      setIsFetching(false);
    });
  }, [drivePath, db]);

  return (
    <List
      isShowingDetail={filesFiltered.length > 0}
      enableFiltering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Search in ${displayPath(drivePath)}`}
      isLoading={isFetching}
      onSelectionChange={(id) => setSelectedFile(findFile(id))}
    >
      {filesFiltered.length > 0 ? (
        <List.Section
          title="Files"
          subtitle={filesCacheGeneratedAt ? `Cached At: ${filesCacheGeneratedAt.toLocaleString()}` : ""}
        >
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
                  <Action
                    title="Rebuild Cache"
                    icon={Icon.Hammer}
                    onAction={forceRebuildCache}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
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
