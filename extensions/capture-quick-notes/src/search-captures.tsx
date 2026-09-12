import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  archiveCapture,
  CaptureDTO,
  CaptureListDTO,
  deleteCapture,
  errorMessage,
  listCaptureLists,
  listCaptures,
  openCapture,
} from "./capture-cli";

const ALL_CAPTURES = "";
const INCLUDE_ARCHIVED = "__include-archived";

export default function Command() {
  const [captures, setCaptures] = useState<CaptureDTO[]>([]);
  const [lists, setLists] = useState<CaptureListDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState(ALL_CAPTURES);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    listCaptureLists()
      .then(setLists)
      .catch(() => {
        // The dropdown just shows the built-in filters.
      });
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadCaptures() {
      setIsLoading(true);
      try {
        const listName =
          filter === ALL_CAPTURES || filter === INCLUDE_ARCHIVED
            ? undefined
            : filter;
        const result = await listCaptures(
          searchText,
          50,
          listName,
          filter === INCLUDE_ARCHIVED,
        );
        if (isActive) {
          setCaptures(result);
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not load captures",
          message: errorMessage(error),
        });
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadCaptures();
    return () => {
      isActive = false;
    };
  }, [searchText, filter, refreshKey]);

  const refresh = () => setRefreshKey((key) => key + 1);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search captures"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" value={filter} onChange={setFilter}>
          <List.Dropdown.Item title="All Captures" value={ALL_CAPTURES} />
          <List.Dropdown.Item
            title="Include Archived"
            value={INCLUDE_ARCHIVED}
          />
          <List.Dropdown.Section title="Lists">
            {lists.map((list) => (
              <List.Dropdown.Item
                key={list.id}
                title={list.name}
                value={list.name}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      throttle
    >
      {captures.map((capture) => (
        <CaptureListItem
          key={capture.id}
          capture={capture}
          onMutate={refresh}
        />
      ))}
    </List>
  );
}

function CaptureListItem({
  capture,
  onMutate,
}: {
  capture: CaptureDTO;
  onMutate: () => void;
}) {
  const firstURL = capture.urls[0];
  const title = capture.content || firstURL || "Untitled Capture";
  const accessories = [
    capture.isArchived ? { icon: Icon.Tray, tooltip: "Archived" } : undefined,
    capture.listName ? { text: capture.listName } : undefined,
    capture.attachmentCount > 0
      ? { text: `${capture.attachmentCount} attachments` }
      : undefined,
  ].filter(Boolean) as List.Item.Accessory[];

  async function handleOpen() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Opening Capture",
    });
    try {
      await openCapture(capture.id);
      toast.style = Toast.Style.Success;
      toast.title = "Opened in Capture";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not open Capture";
      toast.message = errorMessage(error);
    }
  }

  async function handleArchive() {
    try {
      await archiveCapture(capture.id, capture.isArchived);
      await showToast({
        style: Toast.Style.Success,
        title: capture.isArchived ? "Capture unarchived" : "Capture archived",
      });
      onMutate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not update capture",
        message: errorMessage(error),
      });
    }
  }

  async function handleDelete() {
    const confirmed = await confirmAlert({
      title: "Delete Capture?",
      message: title,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) {
      return;
    }

    try {
      await deleteCapture(capture.id);
      await showToast({ style: Toast.Style.Success, title: "Capture deleted" });
      onMutate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not delete capture",
        message: errorMessage(error),
      });
    }
  }

  return (
    <List.Item
      title={title}
      subtitle={firstURL}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action title="Open in Capture" onAction={handleOpen} />
          <Action.CopyToClipboard
            title="Copy Content"
            content={capture.content}
          />
          {firstURL ? (
            <Action.CopyToClipboard title="Copy First URL" content={firstURL} />
          ) : null}
          <Action
            title={capture.isArchived ? "Unarchive" : "Archive"}
            icon={Icon.Tray}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            onAction={handleArchive}
          />
          <Action
            title="Delete"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={handleDelete}
          />
        </ActionPanel>
      }
    />
  );
}
