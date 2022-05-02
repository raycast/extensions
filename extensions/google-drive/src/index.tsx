import { useCallback, useEffect, useState, createContext, useContext } from "react";
import { ActionPanel, List, Action, Icon, showToast, Toast } from "@raycast/api";
import { existsSync } from "fs";
import { dirname } from "path";
import { useDebounce, useDebouncedCallback } from "use-debounce";

import { FileInfo } from "./types";
import { indexFiles, filesLastIndexedAt, queryFiles, useDb, toggleFavorite, queryFavoriteFiles } from "./db";
import {
  clearAllFilePreviewsCache,
  displayPath,
  escapePath,
  fileMetadataMarkdown,
  getDriveRootPath,
  initialSetup,
  isEmpty,
} from "./utils";

type CommandContextType = {
  handleToggleFavorite: (file: FileInfo) => void;
  reindexFiles: () => void;
  fileDetailsMarkup: string;
};
const CommandContext = createContext<CommandContextType | null>(null);
const useCommandContext = () => {
  const context = useContext(CommandContext);

  if (context === null) {
    throw new Error("useCommandContext must be used within a CommandContext");
  }

  return context;
};

const Command = () => {
  const drivePath = getDriveRootPath();
  const [fileDetailsMarkup, setFileDetailsMarkup] = useState<string>("");
  const [isFetching, setIsFetching] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText] = useDebounce(searchText, 100);
  const [files, setFiles] = useState<{
    filtered: Array<FileInfo>;
    favorites: Array<FileInfo>;
    selected: FileInfo | null;
  }>({ filtered: [], favorites: [], selected: null });
  const [filesIndexGeneratedAt, setFilesIndexGeneratedAt] = useState<Date | null>(null);
  const db = useDb();

  useEffect(initialSetup, []);

  useEffect(() => {
    (async () => setFileDetailsMarkup(await fileMetadataMarkdown(files.selected)))();
  }, [files.selected]);

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
          const isIndexed = await indexFiles(drivePath, db);
          if (isIndexed) {
            setFilesIndexGeneratedAt(await filesLastIndexedAt());
          }

          if (files.filtered.length === 0) {
            setIsFetching(true);
            setFiles((prevFiles) => ({
              ...prevFiles,
              filtered: queryFiles(db, ""),
              favorites: queryFavoriteFiles(db),
            }));
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
      setFilesIndexGeneratedAt(await filesLastIndexedAt());
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!db) return;

      setIsFetching(true);
      setFiles((prevFiles) => ({
        ...prevFiles,
        filtered: queryFiles(db, debouncedSearchText),
        favorites: isEmpty(debouncedSearchText) ? queryFavoriteFiles(db) : prevFiles.favorites,
      }));
      setIsFetching(false);
    })();
  }, [debouncedSearchText]);

  const findFile = (displayPath?: string): FileInfo | null =>
    (displayPath && files.filtered.find((file) => file.displayPath === displayPath)) || null;

  const reindexFiles = useCallback(async () => {
    if (!db) return;

    setIsFetching(true);
    setFiles({ filtered: [], favorites: [], selected: null });

    showToast({ style: Toast.Style.Animated, title: "Rebuilding files index..." });
    try {
      const isIndexed = await indexFiles(drivePath, db, { force: true });

      if (isIndexed) {
        setFilesIndexGeneratedAt(await filesLastIndexedAt());
        setFiles({ filtered: queryFiles(db, ""), favorites: queryFavoriteFiles(db), selected: null });
        showToast({ style: Toast.Style.Success, title: "Done rebuilding files index! 🎉" });
      }
    } catch (e) {
      console.error(e);
      showToast({
        style: Toast.Style.Failure,
        title: "💥 Could not rebuild files index!",
      });
    } finally {
      setIsFetching(false);
    }
  }, [drivePath, db]);

  const handleToggleFavorite = useCallback(
    (file: FileInfo) => {
      if (!db) return;

      const updatedFile = { ...file, favorite: !file.favorite };
      toggleFavorite(db, file.path, updatedFile.favorite);

      setFiles((prevFiles) => ({
        ...prevFiles,
        filtered: prevFiles.filtered.map((f) => (f.path === file.path ? updatedFile : f)),
        favorites: isEmpty(debouncedSearchText) ? queryFavoriteFiles(db) : prevFiles.favorites,
      }));
    },
    [db, setFiles, debouncedSearchText]
  );

  const handleSelectionChange = useDebouncedCallback((file: FileInfo | null) => {
    setFiles((prevFiles) => ({ ...prevFiles, selected: file }));
  }, 100);

  return (
    <CommandContext.Provider value={{ handleToggleFavorite, reindexFiles, fileDetailsMarkup }}>
      <List
        isShowingDetail={files.filtered.length > 0}
        enableFiltering={false}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder={`Fuzzy search in ${displayPath(drivePath)}`}
        isLoading={isFetching}
        onSelectionChange={(id) => handleSelectionChange(findFile(id?.replace(/__.+__/, "")))}
      >
        {files.filtered.length > 0 ? (
          <>
            {isEmpty(debouncedSearchText) && files.favorites.length > 0 ? (
              <List.Section title="Favorites">
                {files.favorites.map((file) => (
                  <ListItem idPrefix="__fav__" key={file.displayPath} file={file} />
                ))}
              </List.Section>
            ) : null}
            <List.Section
              title={isEmpty(debouncedSearchText) ? "Recent" : "Results"}
              subtitle={
                isEmpty(debouncedSearchText) && filesIndexGeneratedAt
                  ? `Indexed: ${filesIndexGeneratedAt.toLocaleString()}`
                  : ""
              }
            >
              {files.filtered.map((file) => (
                <ListItem idPrefix="" key={file.displayPath} file={file} />
              ))}
            </List.Section>
          </>
        ) : (
          <List.EmptyView
            title={isFetching ? "Fetching files, please wait..." : "No files found"}
            actions={
              <ActionPanel>
                {!isFetching && (
                  <ActionPanel.Section title="General Actions">
                    <ReindexFilesCacheAction />
                    <ClearFilePreviewsCacheAction />
                  </ActionPanel.Section>
                )}
              </ActionPanel>
            }
          />
        )}
      </List>
    </CommandContext.Provider>
  );
};

type ListItemProps = {
  file: FileInfo;
  idPrefix: "__fav__" | "";
};
const ListItem = ({ file, idPrefix }: ListItemProps) => {
  const { handleToggleFavorite, fileDetailsMarkup } = useCommandContext();

  return (
    <List.Item
      id={`${idPrefix}${file.displayPath}`}
      key={file.displayPath}
      icon={{ fileIcon: file.path }}
      title={`${file.favorite ? "⭐ " : ""}${file.name}`}
      detail={<List.Item.Detail markdown={fileDetailsMarkup} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="File Actions">
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
              title={file.favorite ? "Unfavorite" : "Favorite"}
              icon={Icon.Star}
              onAction={() => handleToggleFavorite(file)}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="General Actions">
            <ReindexFilesCacheAction />
            <ClearFilePreviewsCacheAction />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

const ReindexFilesCacheAction = () => {
  const { reindexFiles } = useCommandContext();

  return (
    <Action
      title="Reindex Files Cache"
      icon={Icon.Hammer}
      onAction={reindexFiles}
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
    />
  );
};

const ClearFilePreviewsCacheAction = () => (
  <Action
    title="Clear File Previews Cache"
    icon={Icon.Trash}
    onAction={clearAllFilePreviewsCache}
    shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
  />
);

export default Command;
