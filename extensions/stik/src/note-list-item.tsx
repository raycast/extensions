import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Icon,
  List,
  confirmAlert,
  showToast,
  Toast,
} from "@raycast/api";
import { NoteMeta, deleteNote, moveNote } from "./utils";

interface NoteListItemProps {
  note: NoteMeta;
  folders: string[];
  onRefresh: () => void;
  showFolder?: boolean;
}

export function NoteListItem({
  note,
  folders,
  onRefresh,
  showFolder = true,
}: NoteListItemProps) {
  const accessories: List.Item.Accessory[] = [];
  if (showFolder && note.folder) {
    accessories.push({ tag: { value: note.folder, color: Color.Orange } });
  }
  accessories.push({ date: note.mtime });

  return (
    <List.Item
      title={note.title}
      subtitle={note.created.toLocaleDateString()}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="View Note"
              icon={Icon.Eye}
              target={<Detail markdown={note.body} />}
            />
            <Action.Open
              title="Open in Editor"
              icon={Icon.Pencil}
              target={note.filePath}
            />
            <Action.CopyToClipboard title="Copy Contents" content={note.body} />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <ActionPanel.Submenu
              title="Move to Folder"
              icon={Icon.Folder}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
            >
              <Action
                title="Root (No Folder)"
                icon={Icon.Document}
                onAction={async () => {
                  try {
                    await moveNote(note.filePath, "");
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Moved to root",
                    });
                    onRefresh();
                  } catch (err) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Move failed",
                      message: String(err),
                    });
                  }
                }}
              />
              {folders
                .filter((f) => f !== note.folder)
                .map((folder) => (
                  <Action
                    key={folder}
                    title={folder}
                    icon={Icon.Folder}
                    onAction={async () => {
                      try {
                        await moveNote(note.filePath, folder);
                        await showToast({
                          style: Toast.Style.Success,
                          title: `Moved to ${folder}`,
                        });
                        onRefresh();
                      } catch (err) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Move failed",
                          message: String(err),
                        });
                      }
                    }}
                  />
                ))}
            </ActionPanel.Submenu>

            <Action
              title="Delete Note"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                const confirmed = await confirmAlert({
                  title: "Delete Note",
                  message: `Are you sure you want to delete "${note.title}"?`,
                  primaryAction: {
                    title: "Delete",
                    style: Alert.ActionStyle.Destructive,
                  },
                });
                if (!confirmed) return;
                try {
                  await deleteNote(note.filePath);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Note deleted",
                  });
                  onRefresh();
                } catch (err) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Delete failed",
                    message: String(err),
                  });
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
