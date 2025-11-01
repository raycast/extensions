import { Action, ActionPanel, Icon, List, Grid, getPreferenceValues, Color } from "@raycast/api";
import type { Folder, Item } from "./@types/eagle";
import EagleItem from "./components/EagleItem";
import { checkEagleInstallation } from "./utils/checkInstall";
import { showEagleNotOpenToast } from "./utils/error";
import { useFolderItemList, useFolderList, useThumbnail, useRootItemList } from "./utils/query";
import { ItemDetail } from "./components/ItemDetail";
import { FolderNavigationActions } from "./components/FolderNavigationActions";
import { MoveToTrashAction } from "./components/MoveToTrashAction";
import { CreateFolderAction } from "./components/CreateFolderAction";
import { RenameFolderAction } from "./components/RenameFolderAction";
import { UpdateFolderAction } from "./components/UpdateFolderAction";
import { EditItemTagsAction } from "./components/EditItemTagsAction";
import { EditItemAnnotationAction } from "./components/EditItemAnnotationAction";

interface Preferences {
  layout: "list" | "grid";
}

const folderColorMap: Record<string, Color> = {
  red: Color.Red,
  orange: Color.Orange,
  yellow: Color.Yellow,
  green: Color.Green,
  aqua: Color.Blue,
  blue: Color.Blue,
  purple: Color.Purple,
  pink: Color.Magenta,
};

const getFolderColor = (color?: string): Color | undefined => {
  return color ? folderColorMap[color] : undefined;
};

function GridEagleItem({ item, onUpdate }: { item: Item; onUpdate?: () => void }) {
  const { data: thumbnail } = useThumbnail(item.id);

  // Convert file:// URL back to regular path
  const filePath = thumbnail ? decodeURIComponent(thumbnail.replace("file://", "")) : undefined;

  return (
    <Grid.Item
      content={filePath ? { source: filePath } : { source: Icon.Document }}
      title={item.name}
      actions={
        <ActionPanel>
          <Action.Push target={<ItemDetail item={item} />} title="View Detail" icon={Icon.Eye} />
          <FolderNavigationActions item={item} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          {!item.isDeleted && (
            <>
              <ActionPanel.Section title="Edit">
                <EditItemTagsAction item={item} onUpdate={onUpdate} />
                <EditItemAnnotationAction item={item} onUpdate={onUpdate} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <MoveToTrashAction item={item} onUpdate={onUpdate} />
              </ActionPanel.Section>
            </>
          )}
        </ActionPanel>
      }
    />
  );
}

function GridFolderItem({ folder, onUpdate }: { folder: Folder; onUpdate?: () => void }) {
  return (
    <Grid.Item
      content={{ source: Icon.Folder, tintColor: getFolderColor(folder.iconColor) }}
      title={folder.name}
      subtitle={`${folder.children.length} subfolder(s)`}
      actions={
        <ActionPanel>
          <Action.Push title="Open Folder" icon={Icon.ArrowRight} target={<FolderView folder={folder} />} />
          <ActionPanel.Section title="Manage">
            <UpdateFolderAction folder={folder} onUpdated={onUpdate} />
            <RenameFolderAction folder={folder} onRenamed={onUpdate} />
            <CreateFolderAction parentFolderId={folder.id} onCreated={onUpdate} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function FolderItem({ folder, onUpdate }: { folder: Folder; onUpdate?: () => void }) {
  return (
    <List.Item
      title={folder.name}
      icon={{ source: Icon.Folder, tintColor: getFolderColor(folder.iconColor) }}
      detail={<List.Item.Detail markdown={`# ${folder.name}\n\nFolder with ${folder.children.length} subfolder(s)`} />}
      actions={
        <ActionPanel>
          <Action.Push title="Open Folder" icon={Icon.ArrowRight} target={<FolderView folder={folder} />} />
          <ActionPanel.Section title="Manage">
            <UpdateFolderAction folder={folder} onUpdated={onUpdate} />
            <RenameFolderAction folder={folder} onRenamed={onUpdate} />
            <CreateFolderAction parentFolderId={folder.id} onCreated={onUpdate} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function FolderView({ folder }: { folder: Folder }) {
  const preferences = getPreferenceValues<Preferences>();
  const subFolders = folder.children;
  const { data: items = [], revalidate } = useFolderItemList(folder.id);

  if (preferences.layout === "grid") {
    return (
      <Grid>
        {subFolders.length > 0 ? (
          <Grid.Section title="Folders">
            {subFolders.map((folder) => (
              <GridFolderItem key={folder.id} folder={folder} />
            ))}
          </Grid.Section>
        ) : null}
        <Grid.Section title="Items">
          {items.map((item) => (
            <GridEagleItem key={item.id} item={item} onUpdate={revalidate} />
          ))}
        </Grid.Section>
      </Grid>
    );
  }

  const images = items.map((item) => <EagleItem key={item.id} item={item} onUpdate={revalidate} />);

  return (
    <List isShowingDetail>
      {subFolders.length > 0 ? (
        <List.Section title="Folders">
          {subFolders.map((folder) => (
            <FolderItem key={folder.id} folder={folder} />
          ))}
        </List.Section>
      ) : null}

      {subFolders.length > 0 ? <List.Section title="Images">{images}</List.Section> : images}
    </List>
  );
}

export default function Folder() {
  const preferences = getPreferenceValues<Preferences>();
  const { data: folders = [], isLoading: foldersLoading, error, revalidate: revalidateFolders } = useFolderList();
  const { data: rootItems = [], isLoading: itemsLoading, revalidate } = useRootItemList();

  const isLoading = foldersLoading || itemsLoading;

  checkEagleInstallation();

  if (error && "code" in error && error.code === "ECONNREFUSED") {
    showEagleNotOpenToast();
  } else if (error) {
    console.error(error);
  }

  if (preferences.layout === "grid") {
    return (
      <Grid isLoading={isLoading}>
        {folders.length > 0 && (
          <Grid.Section title="Folders">
            {folders.map((folder) => (
              <GridFolderItem key={folder.id} folder={folder} onUpdate={revalidateFolders} />
            ))}
          </Grid.Section>
        )}
        {rootItems.length > 0 && (
          <Grid.Section title="Items">
            {rootItems.map((item) => (
              <GridEagleItem key={item.id} item={item} onUpdate={revalidate} />
            ))}
          </Grid.Section>
        )}
        <Grid.Section title="Actions">
          <Grid.Item
            content={{ source: Icon.Plus }}
            title="Create Folder"
            actions={
              <ActionPanel>
                <CreateFolderAction onCreated={revalidateFolders} />
              </ActionPanel>
            }
          />
        </Grid.Section>
      </Grid>
    );
  }

  return (
    <List isShowingDetail isLoading={isLoading}>
      {folders.length > 0 && (
        <List.Section title="Folders">
          {folders.map((folder) => (
            <FolderItem key={folder.id} folder={folder} onUpdate={revalidateFolders} />
          ))}
        </List.Section>
      )}
      {rootItems.length > 0 && (
        <List.Section title="Items">
          {rootItems.map((item) => (
            <EagleItem key={item.id} item={item} onUpdate={revalidate} />
          ))}
        </List.Section>
      )}
      <List.Section title="Actions">
        <List.Item
          title="Create Folder"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <CreateFolderAction onCreated={revalidateFolders} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
