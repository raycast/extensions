import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  deleteHistoryEntry,
  deleteHistoryFolder,
  getHistoryEntries,
  markHistoryEntryCopied,
  NotionIdHistoryEntry,
  renameHistoryEntry,
  setHistoryEntryFolder,
  togglePinnedHistoryEntry,
} from "./lib/history";

const ALL_FOLDERS_FILTER = "__all__";
const CREATE_FOLDER_OPTION = "__create__";
const REMOVE_FOLDER_OPTION = "__remove__";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function entryAccessories(entry: NotionIdHistoryEntry): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [
    {
      tag: {
        value: formatDate(entry.lastCopiedAt),
        color: Color.SecondaryText,
      },
      tooltip: `Last copied ${new Date(entry.lastCopiedAt).toLocaleString("en-US")}`,
    },
  ];

  if (entry.pinned) {
    accessories.unshift({
      tag: {
        value: "Pinned",
        color: Color.Yellow,
      },
      tooltip: "Pinned",
    });
  }

  if (entry.folder) {
    accessories.unshift({
      icon: {
        source: Icon.Folder,
        tintColor: Color.SecondaryText,
      },
      tooltip: `Folder: ${entry.folder}`,
    });
  }

  return accessories;
}

function FolderForm(props: {
  entry: NotionIdHistoryEntry;
  folders: string[];
  onSubmit: (folder: string | undefined) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [folderChoice, setFolderChoice] = useState(props.entry.folder ?? CREATE_FOLDER_OPTION);

  return (
    <Form
      navigationTitle={props.entry.folder ? "Edit Folder" : "Move to Folder"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Folder"
            onSubmit={async (values: { folderChoice: string; folderName: string }) => {
              const folder =
                values.folderChoice === REMOVE_FOLDER_OPTION
                  ? undefined
                  : values.folderChoice === CREATE_FOLDER_OPTION
                    ? values.folderName
                    : values.folderChoice;

              await props.onSubmit(folder);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="folderChoice" title="Folder" value={folderChoice} onChange={setFolderChoice}>
        {props.folders.map((folder) => (
          <Form.Dropdown.Item key={folder} value={folder} title={folder} />
        ))}
        <Form.Dropdown.Item value={CREATE_FOLDER_OPTION} title="Create New Folder" />
        <Form.Dropdown.Item value={REMOVE_FOLDER_OPTION} title="No Folder" />
      </Form.Dropdown>
      {folderChoice === CREATE_FOLDER_OPTION ? (
        <Form.TextField
          id="folderName"
          title="New Folder Name"
          placeholder="e.g. Work"
          defaultValue=""
          info="Type a new folder name."
        />
      ) : null}
    </Form>
  );
}

function RenameForm(props: { entry: NotionIdHistoryEntry; onSubmit: (name: string) => Promise<void> }) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle="Rename Page"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Name"
            onSubmit={async (values: { pageName: string }) => {
              await props.onSubmit(values.pageName);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="pageName" title="Page Name" defaultValue={props.entry.pageName} />
    </Form>
  );
}

export default function Command() {
  const [entries, setEntries] = useState<NotionIdHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState(ALL_FOLDERS_FILTER);

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      setEntries(await getHistoryEntries());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleTogglePin = useCallback(async (entry: NotionIdHistoryEntry) => {
    const updatedEntries = await togglePinnedHistoryEntry(entry.notionId);
    setEntries(updatedEntries);

    await showToast({
      style: Toast.Style.Success,
      title: entry.pinned ? `Unpinned ${entry.notionId}` : `Pinned ${entry.notionId}`,
    });
  }, []);

  const handleCopy = useCallback(async (entry: NotionIdHistoryEntry) => {
    await Clipboard.copy(entry.notionId);
    const updatedEntries = await markHistoryEntryCopied(entry.notionId);
    setEntries(updatedEntries);

    await showToast({
      style: Toast.Style.Success,
      title: `Successfully copied ${entry.notionId}`,
    });
  }, []);

  const handleDelete = useCallback(async (entry: NotionIdHistoryEntry) => {
    const confirmed = await confirmAlert({
      title: "Delete saved Notion ID?",
      message: `${entry.pageName}\n${entry.notionId}`,
      primaryAction: {
        title: "Delete Entry",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    const updatedEntries = await deleteHistoryEntry(entry.notionId);
    setEntries(updatedEntries);

    await showToast({
      style: Toast.Style.Success,
      title: `Deleted ${entry.notionId}`,
    });
  }, []);

  const handleSetFolder = useCallback(async (entry: NotionIdHistoryEntry, folder: string | undefined) => {
    const updatedEntries = await setHistoryEntryFolder(entry.notionId, folder);
    setEntries(updatedEntries);

    await showToast({
      style: Toast.Style.Success,
      title: folder?.trim() ? `Saved to ${folder.trim()}` : `Removed folder from ${entry.notionId}`,
    });
  }, []);

  const handleRename = useCallback(async (entry: NotionIdHistoryEntry, pageName: string) => {
    const trimmedName = pageName.trim();
    if (!trimmedName) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Page name cannot be empty",
      });
      return;
    }

    const updatedEntries = await renameHistoryEntry(entry.notionId, trimmedName);
    setEntries(updatedEntries);

    await showToast({
      style: Toast.Style.Success,
      title: `Renamed ${entry.notionId}`,
    });
  }, []);

  const handleDeleteFolder = useCallback(async (folder: string) => {
    const confirmed = await confirmAlert({
      title: "Delete folder?",
      message: `All items in "${folder}" will become unsorted.`,
      primaryAction: {
        title: "Delete Folder",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    const updatedEntries = await deleteHistoryFolder(folder);
    setEntries(updatedEntries);
    setSelectedFolder(ALL_FOLDERS_FILTER);

    await showToast({
      style: Toast.Style.Success,
      title: `Deleted folder ${folder}`,
    });
  }, []);

  const folders = useMemo(() => {
    return [...new Set(entries.map((entry) => entry.folder).filter(Boolean))].sort((left, right) =>
      left!.localeCompare(right!),
    ) as string[];
  }, [entries]);

  useEffect(() => {
    if (selectedFolder === ALL_FOLDERS_FILTER) {
      return;
    }

    if (!folders.includes(selectedFolder)) {
      setSelectedFolder(ALL_FOLDERS_FILTER);
    }
  }, [folders, selectedFolder]);

  const visibleEntries = useMemo(() => {
    if (selectedFolder === ALL_FOLDERS_FILTER) {
      return entries;
    }

    return entries.filter((entry) => entry.folder === selectedFolder);
  }, [entries, selectedFolder]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Search Notion IDs"
      searchBarPlaceholder="Search by page name or Notion ID"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by folder" value={selectedFolder} onChange={setSelectedFolder}>
          <List.Dropdown.Item title="All" value={ALL_FOLDERS_FILTER} />
          {folders.length > 0 ? (
            <List.Dropdown.Section title="Folders">
              {folders.map((folder) => (
                <List.Dropdown.Item key={folder} title={folder} value={folder} />
              ))}
            </List.Dropdown.Section>
          ) : null}
        </List.Dropdown>
      }
      filtering={{ keepSectionOrder: true }}
    >
      {visibleEntries.length === 0 ? (
        <List.EmptyView
          title={entries.length === 0 ? "No copied Notion IDs yet" : "No items in this folder"}
          description={
            entries.length === 0
              ? "Run Extract Notion ID first and successful copies will appear here."
              : "Try another folder filter or move an item into this folder."
          }
        />
      ) : null}

      {visibleEntries.map((entry) => (
        <List.Item
          key={entry.notionId}
          id={entry.notionId}
          icon={{
            source: entry.pinned ? Icon.Star : Icon.Bookmark,
            tintColor: entry.pinned ? Color.Yellow : Color.SecondaryText,
          }}
          title={entry.pageName}
          subtitle={entry.notionId}
          keywords={[entry.notionId, entry.pageName, entry.sourceUrl ?? ""]}
          accessories={entryAccessories(entry)}
          actions={
            <ActionPanel>
              <Action title="Copy Notion ID" onAction={() => handleCopy(entry)} />
              <Action
                title={entry.pinned ? "Unpin Notion ID" : "Pin Notion ID"}
                icon={entry.pinned ? Icon.StarDisabled : Icon.Star}
                shortcut={Keyboard.Shortcut.Common.Pin}
                onAction={() => handleTogglePin(entry)}
              />
              {entry.sourceUrl ? (
                <Action.OpenInBrowser title="Open in Notion" url={entry.sourceUrl} icon={Icon.Globe} />
              ) : null}
              <Action.Push
                title={entry.folder ? "Edit Folder" : "Move to Folder"}
                icon={Icon.Folder}
                target={
                  <FolderForm entry={entry} folders={folders} onSubmit={(folder) => handleSetFolder(entry, folder)} />
                }
              />
              <Action.Push
                title="Rename Page"
                icon={Icon.Pencil}
                target={<RenameForm entry={entry} onSubmit={(pageName) => handleRename(entry, pageName)} />}
              />
              {selectedFolder !== ALL_FOLDERS_FILTER ? (
                <Action
                  title="Delete Folder"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.RemoveAll}
                  onAction={() => handleDeleteFolder(selectedFolder)}
                />
              ) : null}
              <Action
                title="Delete Entry"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => handleDelete(entry)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
