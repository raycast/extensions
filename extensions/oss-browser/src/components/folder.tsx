import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import path from "node:path";
import {
  listPage,
  folderIsEmpty,
  deleteObject,
  filterBookmark,
  getFolderByLocalKey,
  getLocalKeyByFolder,
} from "../utils";
import { CommonActions, ErrView, uploadFiles } from "./common";
import { FileItem } from "./file";

export function Folder(props: { path: string }) {
  const [isLoadingState, updateLoadingState] = useState<boolean>(false);
  const [errState, updateErrState] = useState<boolean>(false);
  const [objectsState, updateObjectsState] = useState<IObject[]>([]);
  const [foldersState, updateFoldersState] = useState<string[]>([]);
  const [bookmarksState, updateBookmarksState] = useState<string[]>([]);
  const [markerState, updateMarkerState] = useState<string>("");
  const [queryState, updateQueryState] = useState<string>("");
  const { push } = useNavigation();

  useEffect(() => {
    onSearch(props.path, "");
  }, []);

  async function onSearch(query: string, marker: string) {
    try {
      updateLoadingState(false);
      updateQueryState(query);
      updateLoadingState(true);
      const [res, bookmarks] = await Promise.all([listPage(query, marker), LocalStorage.allItems()]);
      updateBookmarksState(Object.keys(bookmarks).filter(filterBookmark).map(getFolderByLocalKey));
      updateObjectsState((oldObjects) => {
        const searchObjects = res.objects
          .filter((o) => o.size != 0)
          .map((o) => {
            return {
              name: o.name,
              url: o.url,
              lastModified: o.lastModified,
              type: o.type,
              size: o.size,
            };
          });
        if (marker) {
          oldObjects.push(...searchObjects);
          return oldObjects;
        }
        return searchObjects;
      });
      updateFoldersState((oldFolders) => {
        const searchFolders = res.prefixes || [];
        if (marker) {
          oldFolders.push(...(searchFolders || []));
        }
        if (marker) {
          oldFolders.push(...searchFolders);
          return oldFolders;
        }
        return searchFolders;
      });
      updateMarkerState(res.nextMarker);
    } catch (error) {
      updateErrState(true);
    } finally {
      updateLoadingState(false);
    }
  }

  if (errState) {
    return <ErrView />;
  }
  return (
    <List
      isLoading={isLoadingState}
      throttle={true}
      searchBarPlaceholder={`Search in $root/${props.path} by prefix...`}
      onSearchTextChange={(text) => {
        onSearch(`${props.path}${text}`, "");
      }}
      actions={
        <ActionPanel>
          <CommonActions
            currentFolder={props.path}
            refresh={() => onSearch(queryState, markerState)}
            marks={bookmarksState}
          />
        </ActionPanel>
      }
    >
      <List.EmptyView title="No data" />
      {foldersState.length > 0 && (
        <List.Section title="Folders" subtitle={`Count: ${foldersState.length}`}>
          {foldersState.map((folder) =>
            FolderItem({
              folder,
              refresh: (targetPath?: string) => {
                if (targetPath) {
                  push(<Folder path={targetPath} />);
                  return;
                }
                onSearch(queryState, markerState);
              },
              marks: bookmarksState,
            })
          )}
        </List.Section>
      )}
      {objectsState.length > 0 && (
        <List.Section title="Files" subtitle={`Count: ${objectsState.length}`}>
          {objectsState.map((file) =>
            FileItem({
              file,
              refresh: () => {
                onSearch(queryState, markerState);
              },
              marks: bookmarksState,
            })
          )}
        </List.Section>
      )}
      {markerState && (
        <List.Item
          key={"load_more"}
          id="load_more"
          title={"Load more"}
          icon={{ source: Icon.RotateAntiClockwise, tintColor: Color.PrimaryText }}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.RotateAntiClockwise}
                title="Load more"
                onAction={() => {
                  if (isLoadingState) {
                    return;
                  }
                  onSearch(queryState, markerState);
                }}
              ></Action>
            </ActionPanel>
          }
        ></List.Item>
      )}
    </List>
  );
}

function FolderItem(props: { folder: string; refresh: (targetPath?: string) => void; marks: string[] }) {
  return (
    <List.Item
      key={props.folder}
      id={props.folder}
      title={path.basename(props.folder)}
      icon={{ source: Icon.Folder, tintColor: Color.Blue }}
      accessories={
        props.marks.includes(props.folder)
          ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Bookmark added" }, { text: "Folder" }]
          : [{ text: "Folder" }]
      }
      actions={FolderAction({ folder: props.folder, refresh: props.refresh, marks: props.marks })}
    />
  );
}

function FolderAction(props: { folder: string; refresh: (targetPath?: string) => void; marks: string[] }) {
  async function deleteFolder() {
    if (!(await folderIsEmpty(props.folder))) {
      await showToast({
        style: Toast.Style.Failure,
        title: "The Folder is not empty! Unable to be deleted",
      });
      return;
    }
    confirmAlert({
      title: "Delete the Folder?",
      icon: Icon.Trash,
      message: `Folder [${props.folder}] will be permanently removed`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
        onAction: async () => {
          await showToast({
            style: Toast.Style.Animated,
            title: "Deleting the Folder...",
          });
          try {
            await deleteObject(props.folder);
            await showToast({
              style: Toast.Style.Success,
              title: "Folder deleted",
            });
          } catch (e) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Failed to delete Folder",
            });
          }
          props.refresh();
        },
      },
    });
  }

  return (
    <ActionPanel>
      <ActionPanel.Section title="Folder Actions">
        <Action.Push
          title="Open Folder"
          icon={Icon.ArrowRight}
          target={<Folder path={props.folder}></Folder>}
        ></Action.Push>
        <Action
          title="Upload to Selected Folder"
          icon={Icon.Upload}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          onAction={() => {
            uploadFiles(props.folder, () => props.refresh(props.folder));
          }}
        ></Action>
        <Action
          title="Delete Folder"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd"], key: "delete" }}
          onAction={deleteFolder}
        ></Action>
        {!props.marks.includes(props.folder) && (
          <Action
            title="Add to Bookmarks"
            icon={Icon.Star}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
            onAction={async () => {
              await LocalStorage.setItem(
                getLocalKeyByFolder(props.folder),
                JSON.stringify({
                  key: props.folder,
                  ctime: new Date(),
                })
              );
              props.refresh();
              await showToast({
                title: "Bookmark added",
                style: Toast.Style.Success,
              });
            }}
          ></Action>
        )}
        {props.marks.includes(props.folder) && (
          <Action
            title="Remove from Bookmarks"
            icon={Icon.StarDisabled}
            shortcut={{ modifiers: ["cmd", "opt"], key: "b" }}
            onAction={async () => {
              await LocalStorage.removeItem(getLocalKeyByFolder(props.folder));
              props.refresh();
              await showToast({
                title: "Bookmark removed",
                style: Toast.Style.Success,
              });
            }}
          ></Action>
        )}
      </ActionPanel.Section>
      <CommonActions currentFolder={path.parse(props.folder).dir} refresh={props.refresh} marks={props.marks} />
    </ActionPanel>
  );
}
