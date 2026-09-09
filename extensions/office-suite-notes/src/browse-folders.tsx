import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { listFolders } from "./lib/api";
import { NotesList } from "./components/notes-list";
import { SettingsAction } from "./components/settings-action";

export default function Command({ parent, title = "Browse Folders" }: { parent?: string; title?: string }) {
  const { data, isLoading, error, revalidate } = usePromise(listFolders, [parent]);
  return (
    <List isLoading={isLoading} navigationTitle={title} searchBarPlaceholder="Filter folders…">
      <List.EmptyView
        icon={Icon.Folder}
        title={error ? "Unable to Load Folders" : "No Subfolders"}
        description={error?.message}
        actions={
          <ActionPanel>
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            <SettingsAction />
          </ActionPanel>
        }
      />
      {data?.data.map((folder) => (
        <List.Item
          key={folder.id}
          title={folder.name}
          icon={Icon.Folder}
          accessories={[{ text: `${folder.note_count ?? 0} notes` }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Browse Notes"
                icon={Icon.Document}
                target={<NotesList folder={folder.id} title={folder.name} />}
              />
              <Action.Push
                title="Browse Subfolders"
                icon={Icon.Folder}
                target={<Command parent={folder.id} title={folder.name} />}
              />
              <Action.CopyToClipboard title="Copy Folder ID" content={folder.id} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <SettingsAction />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
