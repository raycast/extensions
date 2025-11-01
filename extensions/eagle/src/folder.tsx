import { Action, ActionPanel, Icon, List, Grid, getPreferenceValues } from "@raycast/api";
import { Folder, Item } from "./@types/eagle";
import EagleItem from "./components/EagleItem";
import { checkEagleInstallation } from "./utils/checkInstall";
import { showEagleNotOpenToast } from "./utils/error";
import { useFolderItemList, useFolderList, useThumbnail, useRootItemList } from "./utils/query";
import { ItemDetail } from "./components/ItemDetail";

interface Preferences {
  layout: "list" | "grid";
}

function GridEagleItem({ item }: { item: Item }) {
  const { data: thumbnail } = useThumbnail(item.id);

  // Convert file:// URL back to regular path
  const filePath = thumbnail ? decodeURIComponent(thumbnail.replace("file://", "")) : undefined;

  return (
    <Grid.Item
      content={filePath ? { source: filePath } : { source: Icon.Document }}
      title={item.name}
      actions={
        <ActionPanel>
          <Action.Push target={<ItemDetail item={item} />} title="View Detail" />
        </ActionPanel>
      }
    />
  );
}

function GridFolderItem({ folder }: { folder: Folder }) {
  return (
    <Grid.Item
      content={{ source: Icon.Folder }}
      title={folder.name}
      subtitle={`${folder.children.length} subfolder(s)`}
      actions={
        <ActionPanel>
          <Action.Push title="Open Folder" target={<FolderView folder={folder} />} />
        </ActionPanel>
      }
    />
  );
}

function FolderItem({ folder }: { folder: Folder }) {
  return (
    <List.Item
      title={folder.name}
      icon={Icon.Finder}
      detail={
        <List.Item.Detail
          markdown={`# ${folder.name}\n\nFolder with ${folder.children.length} subfolder(s)`}
        />
      }
      actions={
        <ActionPanel>
          <Action.Push title="Open Folder" target={<FolderView folder={folder} />} />
        </ActionPanel>
      }
    />
  );
}

function FolderView({ folder }: { folder: Folder }) {
  const preferences = getPreferenceValues<Preferences>();
  const subFolders = folder.children;
  const { data: items } = useFolderItemList(folder.id);

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
            <GridEagleItem key={item.id} item={item} />
          ))}
        </Grid.Section>
      </Grid>
    );
  }

  const images = items.map((item) => <EagleItem key={item.id} item={item} />);

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
  const { data: folders, isLoading: foldersLoading, error } = useFolderList();
  const { data: rootItems, isLoading: itemsLoading } = useRootItemList();

  const isLoading = foldersLoading || itemsLoading;

  checkEagleInstallation();

  if (error?.code === "ECONNREFUSED") {
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
              <GridFolderItem key={folder.id} folder={folder} />
            ))}
          </Grid.Section>
        )}
        {rootItems.length > 0 && (
          <Grid.Section title="Items">
            {rootItems.map((item) => (
              <GridEagleItem key={item.id} item={item} />
            ))}
          </Grid.Section>
        )}
      </Grid>
    );
  }

  return (
    <List isShowingDetail isLoading={isLoading}>
      {folders.length > 0 && (
        <List.Section title="Folders">
          {folders.map((folder) => (
            <FolderItem key={folder.id} folder={folder} />
          ))}
        </List.Section>
      )}
      {rootItems.length > 0 && (
        <List.Section title="Items">
          {rootItems.map((item) => (
            <EagleItem key={item.id} item={item} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
