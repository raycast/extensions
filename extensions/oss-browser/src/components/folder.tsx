import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  environment,
  getPreferenceValues,
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
  getAllBuckets,
  newOssClient,
} from "../utils";
import { CommonActions, ErrView, uploadFile } from "./common";
import { FileItem } from "./file";
import { Action$ } from "raycast-toolkit";

function BucketDropdown(props: { buckets: IBucket[]; onBucketChange: (bucket: string) => void }) {
  const preferences: IPreferences = getPreferenceValues();
  const { buckets, onBucketChange } = props;
  const regions = new Set<string>();
  buckets.forEach((b) => regions.add(b.region));
  return (
    <List.Dropdown
      tooltip="Select Bucket"
      storeValue={true}
      defaultValue={preferences.bucket}
      onChange={(bucket) => {
        onBucketChange(bucket);
      }}
    >
      {Array.from(regions).map((region) => (
        <List.Dropdown.Section title={`Region: ${region}`} key={region}>
          {buckets
            .filter((b) => b.region === region)
            .map((bucket) => (
              <List.Dropdown.Item key={bucket.name} title={bucket.name} value={bucket.name} />
            ))}
        </List.Dropdown.Section>
      ))}
    </List.Dropdown>
  );
}

export function Folder(props: { path: string }) {
  const preferences: IPreferences = getPreferenceValues<IPreferences>();
  const [isLoadingState, updateLoadingState] = useState<boolean>(false);
  const [errState, updateErrState] = useState<boolean>(false);
  const [objectsState, updateObjectsState] = useState<IObject[]>([]);
  const [foldersState, updateFoldersState] = useState<string[]>([]);
  const [bookmarksState, updateBookmarksState] = useState<string[]>([]);
  const [markerState, updateMarkerState] = useState<string>("");
  const [queryState, updateQueryState] = useState<string>("");
  const [bucketsState, updateBucketsState] = useState<IBucket[]>([]);
  const { push } = useNavigation();

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      if (!props.path) {
        const preferences: IPreferences = getPreferenceValues();
        newOssClient("", preferences.region);
        try {
          const buckets = await getAllBuckets();
          updateBucketsState(buckets);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
          if (error.code === "AccessDenied") {
            updateBucketsState([{ region: preferences.region, name: preferences.bucket }]);
          }
        }
      } else {
        updateLoadingState(true);
        const [bookmarks] = await Promise.all([LocalStorage.allItems(), searchByMark(props.path, "")]);
        updateBookmarksState(Object.keys(bookmarks).filter(filterBookmark).map(getFolderByLocalKey));
      }
    } catch (error) {
      updateErrState(true);
    } finally {
      updateLoadingState(false);
    }
  }

  async function refresh(targetPath?: string, bookmark?: boolean, onlyBookMark?: boolean) {
    if (targetPath) {
      push(<Folder path={targetPath} />);
      return;
    }
    try {
      if (bookmark) {
        const bookmarks = await LocalStorage.allItems();
        updateBookmarksState(Object.keys(bookmarks).filter(filterBookmark).map(getFolderByLocalKey));
        if (onlyBookMark) {
          return;
        }
      }
      updateLoadingState(true);
      await searchByMark(queryState, "");
    } catch (error) {
      updateErrState(true);
    } finally {
      updateLoadingState(false);
    }
  }

  async function onSearch(text: string) {
    try {
      updateLoadingState(true);
      await searchByMark(`${props.path}${text}`, "");
    } catch (error) {
      updateErrState(true);
    } finally {
      updateLoadingState(false);
    }
  }

  async function loadMore() {
    if (isLoadingState) {
      return;
    }
    try {
      updateLoadingState(true);
      await searchByMark(queryState, markerState);
    } catch (error) {
      updateErrState(true);
    } finally {
      updateLoadingState(false);
    }
  }

  async function searchByMark(query: string, marker: string) {
    updateQueryState(query);
    const res = await listPage(query, marker);
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
        return oldFolders;
      }
      return searchFolders;
    });
    updateMarkerState(res.nextMarker);
  }

  async function onBucketChange(bucket: string) {
    try {
      const bucketInfo = bucketsState.find((b) => b.name === bucket);
      if (bucketInfo && newOssClient(bucketInfo.name, bucketInfo.region)) {
        updateLoadingState(true);
        const [bookmarks] = await Promise.all([LocalStorage.allItems(), searchByMark(props.path, "")]);
        updateBookmarksState(Object.keys(bookmarks).filter(filterBookmark).map(getFolderByLocalKey));
      }
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
      searchBarPlaceholder={`Search in $Root/${props.path}`}
      onSearchTextChange={onSearch}
      searchBarAccessory={
        !props.path ? <BucketDropdown buckets={bucketsState} onBucketChange={onBucketChange} /> : null
      }
      actions={
        <ActionPanel>
          <CommonActions currentFolder={props.path} refresh={refresh} marks={bookmarksState} />
        </ActionPanel>
      }
    >
      <List.EmptyView title="No Data" icon={{ source: `no-view@${environment.theme}.png` }} />
      {bookmarksState.length > 0 && preferences.stickBookmark && !props.path && (
        <List.Section title="Bookmarks">
          {bookmarksState.map((bookmark) =>
            FolderItem({
              folder: bookmark,
              refresh: refresh,
              marks: bookmarksState,
              isMarkView: true,
            })
          )}
        </List.Section>
      )}
      {foldersState.length > 0 && (
        <List.Section title="Folders" subtitle={`Count: ${foldersState.length}`}>
          {foldersState.map((folder) =>
            FolderItem({
              folder,
              refresh: refresh,
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
              refresh: refresh,
              marks: bookmarksState,
            })
          )}
        </List.Section>
      )}
      {markerState && foldersState.length + objectsState.length && (
        <List.Item
          key={"load_more"}
          id="load_more"
          title={"Load more"}
          icon={{ source: Icon.RotateAntiClockwise, tintColor: Color.PrimaryText }}
          actions={
            <ActionPanel>
              <Action icon={Icon.RotateAntiClockwise} title="Load more" onAction={loadMore}></Action>
            </ActionPanel>
          }
        ></List.Item>
      )}
    </List>
  );
}

function FolderItem(props: { folder: string; refresh: () => void; marks: string[]; isMarkView?: boolean }) {
  const accessories = [];
  if (!props.isMarkView && props.marks.includes(props.folder)) {
    accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Bookmark added" });
  }
  accessories.push({ text: "Folder" });
  return (
    <List.Item
      key={props.isMarkView ? `${props.folder}_mark` : props.folder}
      id={props.isMarkView ? `${props.folder}_mark` : props.folder}
      title={path.basename(props.folder)}
      icon={
        props.isMarkView
          ? { source: Icon.Folder, tintColor: Color.Yellow }
          : { source: Icon.Folder, tintColor: Color.Blue }
      }
      accessories={accessories}
      actions={FolderAction({
        folder: props.folder,
        refresh: props.refresh,
        marks: props.marks,
      })}
    />
  );
}

function FolderAction(props: {
  folder: string;
  refresh: (targetPath?: string, bookmark?: boolean, onlyBookMark?: boolean) => void;
  marks: string[];
}) {
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
            await Promise.all([deleteObject(props.folder), LocalStorage.removeItem(getLocalKeyByFolder(props.folder))]);
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
          props.refresh("", props.marks.includes(props.folder));
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
        <Action$.SelectFile
          title="Upload to Selected Folder"
          icon={Icon.Upload}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          onSelect={(filePath) => {
            if (!filePath) {
              return;
            }
            uploadFile(props.folder, filePath, () => props.refresh(props.folder));
          }}
        />
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
              props.refresh("", true, true);
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
              props.refresh("", true, true);
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
