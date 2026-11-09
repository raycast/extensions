import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { toError } from "./api/problems";
import { ProblemView } from "./components/problem";
import { SavesList } from "./components/saves-list";
import { useFolders } from "./lib/library";
import { folderLink } from "./lib/links";

export default function Command() {
  const folders = useFolders();
  const data = folders.data ?? [];
  const failed = folders.error && !data.length ? toError(folders.error) : null;

  return (
    <List isLoading={folders.isLoading} searchBarPlaceholder="Search folders…">
      {failed ? (
        <ProblemView error={failed} onRetry={folders.revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.Folder}
          title="No folders yet"
          description="Create folders in Pond to group saves."
        />
      )}
      {data.map((folder) => (
        <List.Item
          key={folder.id}
          title={folder.name}
          subtitle={folder.parentId ? folder.path : undefined}
          keywords={folder.path.split(" / ")}
          icon={{ source: Icon.Folder, tintColor: folder.color ?? Color.SecondaryText }}
          accessories={[{ text: folder.count.toLocaleString(), tooltip: `${folder.count.toLocaleString()} saves` }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Saves"
                icon={Icon.List}
                target={<SavesList filter={{ kind: "folder", id: folder.id }} navigationTitle={folder.path} />}
              />
              <Action.Open title="Open in Pond" icon={Icon.AppWindow} target={folderLink(folder.id)} />
              <Action.CopyToClipboard
                title="Copy Pond Link"
                content={folderLink(folder.id)}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <Action.CreateQuicklink
                title="Create Quicklink"
                quicklink={{ name: `Pond Folder ${folder.name}`, link: folderLink(folder.id) }}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={folders.revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
