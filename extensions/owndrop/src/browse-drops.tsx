import { useEffect, useMemo, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  List,
  open,
  openExtensionPreferences,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import DropDetail from "./drop-detail";
import { getDropKind } from "./content";
import { copyDrop } from "./clipboard";
import {
  deleteDrop,
  downloadDropToDownloads,
  downloadDropForClipboard,
  type DropItem,
  extractUrl,
  getCacheScope,
  getServerUrl,
  listDrops,
  setDropPinned,
} from "./api";

function getItemTitle(item: DropItem): string {
  if (item.type === "text") {
    if (item.linkPreview?.title) return item.linkPreview.title;
    return (item.text ?? "").split("\n")[0]?.slice(0, 90) || "Empty text";
  }
  return item.name || "Untitled file";
}

function getItemIcon(item: DropItem): Icon {
  const icons = {
    text: Icon.Text,
    link: Icon.Link,
    image: Icon.Image,
    video: Icon.Video,
    audio: Icon.Music,
    pdf: Icon.Document,
    file: Icon.Document,
  };
  return icons[getDropKind(item)];
}

export default function BrowseDropsCommand({ uploaded }: { uploaded?: DropItem } = {}) {
  let cacheScope: string;
  try {
    cacheScope = getCacheScope();
  } catch (err) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Invalid OwnDrop Configuration"
          description={(err as Error).message}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  return <BrowseDropsList cacheScope={cacheScope} uploaded={uploaded} />;
}

function BrowseDropsList({ cacheScope, uploaded }: { cacheScope: string; uploaded?: DropItem }) {
  const seededUpload = useRef(false);
  const recentItems = useRef<DropItem[]>([]);
  const abortable = useRef<AbortController | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(uploaded?.id ?? null);
  const [removedUpload, setRemovedUpload] = useState(false);
  const [hasLoadedFromServer, setHasLoadedFromServer] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [remoteQuery, setRemoteQuery] = useState("");
  const query = searchText.trim().toLowerCase();

  useEffect(() => {
    if (!query) {
      setRemoteQuery("");
      return;
    }
    const timer = setTimeout(() => setRemoteQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const {
    data: items,
    isLoading,
    error,
    revalidate,
    mutate,
  } = useCachedPromise(
    async (_scope: string, q: string) => {
      const result = await listDrops(q, 60, abortable.current?.signal);
      if (!q) setHasLoadedFromServer(true);
      return result;
    },
    [cacheScope, remoteQuery],
    {
      abortable,
      keepPreviousData: true,
      cacheWriteDebounce: 0,
      failureToastOptions: {
        title: "Could not refresh drops",
        message: "Showing cached results if available. Try Refresh.",
      },
    },
  );

  useEffect(() => {
    if (!remoteQuery && items) recentItems.current = items;
  }, [remoteQuery, items]);

  useEffect(() => {
    if (!uploaded || seededUpload.current || remoteQuery) return;
    seededUpload.current = true;
    void mutate(Promise.resolve(), {
      optimisticUpdate: (current) => [uploaded, ...(current ?? []).filter((item) => item.id !== uploaded.id)],
      shouldRevalidateAfter: true,
    }).catch(() => {});
  }, [uploaded, remoteQuery, mutate]);

  useEffect(() => {
    if (isLoading || query !== remoteQuery) return;
    const timer = setInterval(() => void revalidate(), 10000);
    return () => clearInterval(timer);
  }, [revalidate, isLoading, query, remoteQuery]);

  const visibleItems = useMemo(() => {
    const current =
      query !== remoteQuery
        ? [...new Map([...recentItems.current, ...(items ?? [])].map((item) => [item.id, item])).values()]
        : [...(items ?? [])];
    if (uploaded && !removedUpload && !hasLoadedFromServer && !current.some((item) => item.id === uploaded.id)) {
      current.unshift(uploaded);
    }
    return current
      .filter(
        (item) =>
          !query ||
          [item.text, item.name, item.device, item.linkPreview?.title].some((value) =>
            value?.toLowerCase().includes(query),
          ),
      )
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [items, uploaded, removedUpload, hasLoadedFromServer, query, remoteQuery]);

  const dropAction = async () => {
    try {
      await launchCommand({ name: "drop-clipboard", type: LaunchType.UserInitiated });
    } catch (err) {
      await showFailureToast(err, { title: "Failed to launch Drop Clipboard" });
    }
  };
  const selectedItem = visibleItems.find((item) => item.id === selectedId) ?? visibleItems[0];

  const handleOpenFile = async (item: DropItem) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Opening file…" });
    try {
      const localPath = await downloadDropForClipboard(item);
      await open(localPath);
      toast.style = Toast.Style.Success;
      toast.title = "Opened";
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "Could not open file" });
    }
  };

  const handleDownload = async (item: DropItem, copyFileAfter: boolean) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${copyFileAfter ? "Copying" : "Downloading"} ${item.name || "file"}…`,
    });
    try {
      if (copyFileAfter) {
        await copyDrop(item);
        toast.hide();
        await showHUD(`Copied ${item.name || "file"}`);
      } else {
        const dest = await downloadDropToDownloads(item);
        toast.style = Toast.Style.Success;
        toast.title = "Downloaded to Downloads";
        toast.message = dest;
      }
    } catch (err) {
      await toast.hide();
      await showFailureToast(err, { title: copyFileAfter ? "Copy failed" : "Download failed" });
    }
  };

  const handleTogglePin = async (item: DropItem) => {
    try {
      await mutate(setDropPinned(item.id, !item.pinned), {
        optimisticUpdate: (current) =>
          (current ?? []).map((entry) => (entry.id === item.id ? { ...entry, pinned: !item.pinned } : entry)),
      });
      await showToast({
        style: Toast.Style.Success,
        title: item.pinned ? "Unpinned" : "Pinned to top",
      });
    } catch (err) {
      await showFailureToast(err, { title: "Failed to update pin" });
    }
  };

  const handleDelete = async (item: DropItem) => {
    const ok = await confirmAlert({
      title: "Delete Drop Item?",
      message: getItemTitle(item),
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    try {
      await mutate(deleteDrop(item.id), {
        optimisticUpdate: (current) => (current ?? []).filter((entry) => entry.id !== item.id),
      });
      if (item.id === uploaded?.id) setRemovedUpload(true);
      await showToast({ style: Toast.Style.Success, title: "Deleted" });
    } catch (err) {
      await showFailureToast(err, { title: "Delete failed" });
    }
  };

  return (
    <List
      isShowingDetail={Boolean(selectedItem)}
      selectedItemId={selectedId ?? undefined}
      onSelectionChange={setSelectedId}
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarPlaceholder="Search your drops by text, filename, or device…"
      actions={
        <ActionPanel>
          <Action title="Drop Clipboard" icon={Icon.Upload} onAction={dropAction} />
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
        </ActionPanel>
      }
    >
      {error && visibleItems.length === 0 ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could Not Connect to OwnDrop"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : visibleItems.length === 0 ? (
        <List.EmptyView
          icon={Icon.Tray}
          title={isLoading || query !== remoteQuery ? "Searching Drops…" : "No Drops"}
          description="Run Drop Clipboard to send clipboard content. Browse Drops refreshes every 10 seconds."
        />
      ) : (
        <List.Section title={error ? "Cached Results" : undefined}>
          {visibleItems.map((item) => {
            const kind = getDropKind(item);
            const url = item.type === "text" ? extractUrl(item.text) : null;

            return (
              <List.Item
                key={item.id}
                id={item.id}
                icon={getItemIcon(item)}
                title={getItemTitle(item)}
                detail={item.id === selectedItem?.id ? <DropDetail key={item.id} item={item} /> : undefined}
                actions={
                  <ActionPanel>
                    {item.type === "text" && item.text ? (
                      <>
                        {url && <Action.OpenInBrowser title="Open Link" url={url} />}
                        <Action.CopyToClipboard title="Copy" content={item.text} />
                        <Action.Paste title="Paste to Active App" content={item.text} />
                      </>
                    ) : (
                      <>
                        {(kind === "video" || kind === "audio") && (
                          <Action
                            title={kind === "video" ? "Play Video" : "Play Audio"}
                            icon={Icon.Play}
                            onAction={() => handleOpenFile(item)}
                          />
                        )}
                        <Action title="Copy" icon={Icon.Clipboard} onAction={() => handleDownload(item, true)} />
                        {kind !== "video" && kind !== "audio" && (
                          <Action title="Open File" icon={Icon.Eye} onAction={() => handleOpenFile(item)} />
                        )}
                        <Action
                          title="Download to Downloads"
                          icon={Icon.Download}
                          shortcut={Keyboard.Shortcut.Common.Save}
                          onAction={() => handleDownload(item, false)}
                        />
                      </>
                    )}
                    <ActionPanel.Section>
                      <Action title="Drop Clipboard" icon={Icon.Upload} onAction={dropAction} />
                      <Action
                        title={item.pinned ? "Unpin Item" : "Pin to Top"}
                        icon={Icon.Pin}
                        shortcut={Keyboard.Shortcut.Common.Pin}
                        onAction={() => handleTogglePin(item)}
                      />
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                        onAction={revalidate}
                      />
                      <Action title="Open OwnDrop in Browser" icon={Icon.Globe} onAction={() => open(getServerUrl())} />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action
                        title="Delete Item"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                        onAction={() => handleDelete(item)}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
