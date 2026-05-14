import {
  ActionPanel,
  Action,
  Alert,
  confirmAlert,
  Grid,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  showToast,
  Toast,
  trash,
} from "@raycast/api";
import { showFailureToast, useCachedState, usePromise } from "@raycast/utils";
import { PathLike } from "fs";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  defaultDownloadsLayout,
  downloadsFolder,
  getDownloads,
  getQuickLookPreviewDataUrl,
  getTextFilePreview,
  isImageFile,
  isTextFile,
  showPreview,
  withAccessToDownloadsFolder,
  Download,
  formatFileSize,
  getFileType,
} from "./utils";

function FilePreviewDetail({ download, isSelected }: { download: Download; isSelected: boolean }) {
  const isDarwin = process.platform === "darwin";
  const isHiddenFile = download.file.startsWith(".");
  const isText = !download.isDirectory && isTextFile(download.file);
  const shouldShowImagePreview =
    isDarwin && showPreview && !download.isDirectory && isSelected && !isHiddenFile && !isText;
  const shouldShowTextPreview = showPreview && !download.isDirectory && isSelected && !isHiddenFile && isText;

  const { data, isLoading } = usePromise(
    async (path: string) => {
      return await getQuickLookPreviewDataUrl(path);
    },
    [download.path],
    { execute: shouldShowImagePreview },
  );

  if (!isSelected) {
    return null;
  }

  let markdown: string | null = null;
  if (shouldShowTextPreview) {
    markdown = getTextFilePreview(download.path);
  } else if (shouldShowImagePreview) {
    markdown = isLoading ? "*Loading preview...*" : data ? `![Preview](${data})` : "*No preview available*";
  }

  return (
    <List.Item.Detail
      isLoading={shouldShowImagePreview && isLoading}
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="File" text={download.file} />
          <List.Item.Detail.Metadata.Separator />
          {download.isDirectory ? (
            <>
              <List.Item.Detail.Metadata.Label
                title="Items"
                text={
                  download.itemCount !== undefined
                    ? `${download.itemCount} item${download.itemCount !== 1 ? "s" : ""}`
                    : "—"
                }
              />
              <List.Item.Detail.Metadata.Separator />
            </>
          ) : (
            <>
              <List.Item.Detail.Metadata.Label title="Size" text={formatFileSize(download.size)} />
              <List.Item.Detail.Metadata.Separator />
            </>
          )}
          <List.Item.Detail.Metadata.Label title="Type" text={getFileType(download)} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Last modified" text={download.lastModifiedAt.toLocaleString()} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Created" text={download.createdAt.toLocaleString()} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

const PAGE_SIZE = 100;
const MOVE_TO_TRASH_CONFIRMATION_KEY = "manage-downloads-move-to-trash-confirmed";

function Command({ currentFolderPath = downloadsFolder }: { currentFolderPath?: string }) {
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [nextOffset, setNextOffset] = useState(0);
  const [downloadsLayout, setDownloadsLayout] = useCachedState("downloadsLayout", defaultDownloadsLayout);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isShowingDetail, setIsShowingDetail] = useCachedState("isShowingDetail", true);
  const cancelRef = useRef<AbortController | null>(null);

  const loadNextPage = useCallback((offset: number) => {
    setIsLoading(true);
    cancelRef.current?.abort();
    cancelRef.current = new AbortController();

    try {
      const newDownloads = getDownloads(PAGE_SIZE, offset, currentFolderPath);
      const hasMoreItems = newDownloads.length === PAGE_SIZE;

      if (!cancelRef.current.signal.aborted) {
        if (offset === 0) {
          setDownloads(newDownloads);
          setSelectedItemId(newDownloads[0]?.path ?? null);
        } else {
          setDownloads((prev: Download[]) => [...prev, ...newDownloads]);
        }
        setHasMore(hasMoreItems);
        setNextOffset(offset + PAGE_SIZE);
      }
    } catch (error) {
      console.error("Error loading downloads:", error);
    } finally {
      if (!cancelRef.current.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  // Load initial page
  useEffect(() => {
    loadNextPage(0);
  }, [loadNextPage]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadNextPage(nextOffset);
    }
  }, [isLoading, hasMore, nextOffset, loadNextPage]);

  function handleTrash(paths: PathLike | PathLike[]) {
    setDownloads((downloads: Download[]) =>
      downloads.filter((download: Download) =>
        Array.isArray(paths) ? !paths.includes(download.path) : paths !== download.path,
      ),
    );
  }

  async function handleMoveToTrash(paths: PathLike | PathLike[]) {
    const hasConfirmedMoveToTrash = await LocalStorage.getItem<boolean>(MOVE_TO_TRASH_CONFIRMATION_KEY);
    let shouldTrash = hasConfirmedMoveToTrash ?? false;

    if (!hasConfirmedMoveToTrash) {
      shouldTrash = await confirmAlert({
        title: "Move to Trash?",
        message: "Are you sure you want to move the selected download item(s) to Trash?",
        primaryAction: {
          title: "Move to Trash",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "Cancel",
          style: Alert.ActionStyle.Cancel,
        },
      });

      if (shouldTrash) {
        await LocalStorage.setItem(MOVE_TO_TRASH_CONFIRMATION_KEY, true);
      }
    }

    if (!shouldTrash) {
      return;
    }

    try {
      await trash(paths);
      handleTrash(paths);
      await showToast({ style: Toast.Style.Success, title: "Item Moved to Trash" });
    } catch (error) {
      await showFailureToast(error, { title: "Move to Trash Failed" });
    }
  }

  const handleReload = useCallback(() => {
    setNextOffset(0);
    loadNextPage(0);
  }, [loadNextPage, setNextOffset]);

  const toggleDetailView = useCallback(() => {
    setIsShowingDetail((prev: boolean) => !prev);
  }, []);

  const actions = (download: Download) => (
    <ActionPanel>
      <ActionPanel.Section>
        {download.isDirectory ? (
          <Action.Push title="Open Directory" target={<Command currentFolderPath={download.path} />} />
        ) : (
          <Action.Open title="Open File" target={download.path} />
        )}
        <Action.ShowInFinder path={download.path} />
        <Action.CopyToClipboard
          title="Copy File"
          content={{ file: download.path }}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        <Action
          title="Reload Downloads"
          icon={Icon.RotateAntiClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={handleReload}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.OpenWith path={download.path} shortcut={Keyboard.Shortcut.Common.OpenWith} />
        <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />
        <Action
          title="Toggle Layout"
          icon={downloadsLayout === "list" ? Icon.AppWindowGrid3x3 : Icon.AppWindowList}
          shortcut={{ macOS: { modifiers: ["cmd"], key: "l" }, Windows: { modifiers: ["ctrl"], key: "l" } }}
          onAction={() => setDownloadsLayout(downloadsLayout === "list" ? "grid" : "list")}
        />
        <Action
          title="Toggle Detail View"
          icon={isShowingDetail ? Icon.EyeDisabled : Icon.Eye}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "l" },
            Windows: { modifiers: ["ctrl", "shift"], key: "l" },
          }}
          onAction={toggleDetailView}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Delete Download"
          icon={Icon.Trash}
          shortcut={Keyboard.Shortcut.Common.Remove}
          style={Action.Style.Destructive}
          onAction={() => handleMoveToTrash(download.path)}
        />
        <Action
          title="Delete All Downloads"
          icon={Icon.Trash}
          shortcut={Keyboard.Shortcut.Common.RemoveAll}
          style={Action.Style.Destructive}
          onAction={() => handleMoveToTrash(downloads.map((d: Download) => d.path))}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  const emptyViewProps = {
    icon: { fileIcon: downloadsFolder },
    title: "No downloads found",
    description: "Well, first download some files ¯\\_(ツ)_/¯",
  };

  const getItemProps = (download: Download) => ({
    title: download.file,
    quickLook: { path: download.path, name: download.file },
    actions: actions(download),
  });

  if (downloadsLayout === "grid") {
    return (
      <Grid
        columns={8}
        isLoading={isLoading}
        pagination={{
          onLoadMore: handleLoadMore,
          hasMore,
          pageSize: PAGE_SIZE,
        }}
      >
        {downloads.length === 0 && !isLoading && <Grid.EmptyView {...emptyViewProps} />}
        {downloads.map((download: Download) => (
          <Grid.Item
            key={download.path}
            {...getItemProps(download)}
            content={isImageFile(download.file) ? { source: download.path } : { fileIcon: download.path }}
          />
        ))}
      </Grid>
    );
  }

  return (
    <List
      isShowingDetail={isShowingDetail}
      isLoading={isLoading}
      onSelectionChange={setSelectedItemId}
      pagination={{
        onLoadMore: handleLoadMore,
        hasMore,
        pageSize: PAGE_SIZE,
      }}
    >
      {downloads.length === 0 && !isLoading && <List.EmptyView {...emptyViewProps} />}
      {downloads.map((download: Download) => (
        <List.Item
          key={download.path}
          id={download.path}
          {...getItemProps(download)}
          icon={{ fileIcon: download.path }}
          detail={<FilePreviewDetail download={download} isSelected={selectedItemId === download.path} />}
        />
      ))}
    </List>
  );
}

export default withAccessToDownloadsFolder(Command);
