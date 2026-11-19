import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listFolders } from "./imap-client";
import { ComposeForm } from "./compose-form";
import { Folder } from "./types";

// The mailboxes and the inbox opened on top both show folder counts when the command starts: share one request
// instead of asking Bridge for the status of every folder twice
let foldersRequest: Promise<Folder[]> | undefined;

function listFoldersWithCounts(): Promise<Folder[]> {
  foldersRequest ??= listFolders({ withCounts: true }).finally(() => {
    foldersRequest = undefined;
  });
  return foldersRequest;
}

// Same function for every view, so they share one cache entry
export function useFolders() {
  // Errors are shown by the views, not as the default "Failed to fetch latest data" toast
  return useCachedPromise(listFoldersWithCounts, [], { onError: () => undefined });
}

// Flags cached by older versions were Sets, which JSON turned into {}
function hasFlag(flags: string[] | undefined, flag: string): boolean {
  return Array.isArray(flags) && flags.includes(flag);
}

function folderSegments(folder: Folder): string[] {
  return folder.delimiter ? folder.path.split(folder.delimiter) : [folder.path];
}

// Folders one level below `parentPath`
export function childFolders(folders: Folder[], parentPath: string): Folder[] {
  return folders.filter((folder) => {
    if (hasFlag(folder.flags, "\\Noselect") || !folder.delimiter) return false;
    const parts = folderSegments(folder);
    return parts.length > 1 && parts.slice(0, -1).join(folder.delimiter) === parentPath;
  });
}

// System mailboxes, plus the first level of the user's folders and labels, which Bridge nests under
// "Folders/" and "Labels/". On other servers, top-level folders simply show up as mailboxes.
export function groupFolders(folders: Folder[]): { mailboxes: Folder[]; userFolders: Folder[]; labels: Folder[] } {
  const selectable = folders.filter((folder) => !hasFlag(folder.flags, "\\Noselect"));
  const firstLevelOf = (container: string) =>
    selectable.filter((folder) => {
      const parts = folderSegments(folder);
      return parts.length === 2 && parts[0] === container;
    });
  return {
    mailboxes: selectable.filter((folder) => folderSegments(folder).length === 1),
    userFolders: firstLevelOf("Folders"),
    labels: firstLevelOf("Labels"),
  };
}

export function folderDisplayName(path: string): string {
  if (path.toUpperCase() === "INBOX") return "Inbox";
  return path.split("/").pop() || path;
}

function getFolderIcon(folder: Folder): Icon {
  switch (folder.specialUse) {
    case "\\Inbox":
      return Icon.Envelope;
    case "\\Sent":
      return Icon.Airplane;
    case "\\Drafts":
      return Icon.Pencil;
    case "\\Trash":
      return Icon.Trash;
    case "\\Junk":
      return Icon.ExclamationMark;
    case "\\Archive":
      return Icon.Box;
    case "\\Flagged":
      return Icon.Star;
    case "\\All":
      return Icon.Tray;
    default:
      if (folder.delimiter && folder.path.startsWith(`Labels${folder.delimiter}`)) return Icon.Tag;
      // Bridge doesn't flag every system mailbox with a special-use attribute
      switch (folder.path.toLowerCase()) {
        case "inbox":
          return Icon.Envelope;
        case "starred":
          return Icon.Star;
        case "all mail":
          return Icon.Tray;
        default:
          return Icon.Folder;
      }
  }
}

// Esc already goes back one level (to the parent folder, then Mailboxes), but the action makes it
// discoverable in ⌘K
export function BackAction({ onBack }: { onBack: () => void }) {
  return <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} shortcut={{ modifiers: ["cmd"], key: "[" }} />;
}

export function FolderListItem({
  folder,
  onOpen,
  onRefresh,
  onBack,
}: {
  folder: Folder;
  onOpen: () => void;
  onRefresh: () => void;
  onBack?: () => void;
}) {
  const { push } = useNavigation();
  const accessories: List.Item.Accessory[] = [];
  if (folder.unseenCount) {
    accessories.push({ tag: { value: `${folder.unseenCount}`, color: Color.Blue }, tooltip: "Unread" });
  }
  if (folder.messagesCount !== undefined) {
    accessories.push({ text: `${folder.messagesCount}`, tooltip: "Emails" });
  }

  return (
    <List.Item
      id={`folder:${folder.path}`}
      title={folderDisplayName(folder.path)}
      icon={getFolderIcon(folder)}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action title="Open Folder" icon={Icon.ArrowRight} onAction={onOpen} />
          <Action
            title="Compose New Email"
            icon={Icon.NewDocument}
            onAction={() => push(<ComposeForm mode="new" />)}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={onRefresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          {onBack && <BackAction onBack={onBack} />}
        </ActionPanel>
      }
    />
  );
}
