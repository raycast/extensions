import { useCallback, useEffect, useState, createContext, useContext } from "react";
import { ActionPanel, List, Action, Icon, showToast, Toast, Color } from "@raycast/api";
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
  filePreview,
  getDriveRootPath,
  initialSetup,
  isEmpty,
} from "./utils";

type CommandContextType = {
  handleToggleFavorite: (file: FileInfo) => void;
  reindexFiles: () => void;
  selectedFile: FileInfo | null;
  toggleDetails: () => void;
  isShowingDetail: boolean;
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
  const [isFetching, setIsFetching] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText] = useDebounce(searchText, 100);
  const [files, setFiles] = useState<{
    filtered: Array<FileInfo>;
    favorites: Array<FileInfo>;
    selected: FileInfo | null;
  }>({ filtered: [], favorites: [], selected: null });
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const [filesIndexGeneratedAt, setFilesIndexGeneratedAt] = useState<Date | null>(null);
  const db = useDb();

  useEffect(initialSetup, []);

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
          const isIndexed = await indexFiles(db);
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

    try {
      const isIndexed = await indexFiles(db, { force: true });

      if (isIndexed) {
        setFilesIndexGeneratedAt(await filesLastIndexedAt());
        showToast({ style: Toast.Style.Success, title: "Done rebuilding files index! 🎉" });
        setFiles({ filtered: queryFiles(db, ""), favorites: queryFavoriteFiles(db), selected: null });
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
  }, [db]);

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

  const toggleDetails = () => setIsShowingDetail((prevIsShowingDetail) => !prevIsShowingDetail);

  return (
    <CommandContext.Provider
      value={{ handleToggleFavorite, reindexFiles, selectedFile: files.selected, toggleDetails, isShowingDetail }}
    >
      <List
        isShowingDetail={isShowingDetail && files.filtered.length > 0}
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
            actions={<ActionPanel>{!isFetching && <GeneralActions showToggleDetailsAction={false} />}</ActionPanel>}
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
  const { handleToggleFavorite } = useCommandContext();

  return (
    <List.Item
      id={`${idPrefix}${file.displayPath}`}
      key={file.displayPath}
      icon={{ fileIcon: file.path }}
      title={file.name}
      accessories={
        file.favorite ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Favorite" }] : undefined
      }
      detail={<ListItemDetail file={file} />}
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
          <GeneralActions />
        </ActionPanel>
      }
    />
  );
};

type ListItemDetailProps = {
  file: FileInfo;
};
const ListItemDetail = ({ file }: ListItemDetailProps) => {
  const { selectedFile, isShowingDetail } = useCommandContext();
  const [previewImage, setPreviewImage] = useState("");
  const [markdown, setMarkdown] = useState("## File Information");

  useEffect(() => {
    if (file.displayPath === selectedFile?.displayPath && isShowingDetail) {
      setMarkdown(fileMetadataMarkdown(file));
      const controller = new AbortController();
      filePreview(file, controller).then((previewImage) => {
        if (!controller.signal.aborted) {
          setPreviewImage(previewImage);
        }
      });
      return () => {
        controller.abort();
      };
    }
  }, [selectedFile, isShowingDetail]);

  return <List.Item.Detail markdown={previewImage + markdown} />;
};

const GeneralActions = ({ showToggleDetailsAction = true }) => {
  const { reindexFiles, toggleDetails } = useCommandContext();

  return (
    <ActionPanel.Section title="General Actions">
      {showToggleDetailsAction ? (
        <Action
          title="Toggle Details"
          icon={Icon.Sidebar}
          onAction={toggleDetails}
          shortcut={{ modifiers: ["cmd"], key: "b" }}
        />
      ) : null}
      <Action
        title="Reindex Files Cache"
        icon={Icon.Hammer}
        onAction={reindexFiles}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      />
      <Action
        title="Clear File Previews Cache"
        icon={Icon.Trash}
        onAction={clearAllFilePreviewsCache}
        shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
      />
    </ActionPanel.Section>
  );
};

export default Command;
