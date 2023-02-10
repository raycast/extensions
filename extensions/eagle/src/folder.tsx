import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Folder } from "./@types/eagle";
import EagleItem from "./components/EagleItem";
import { checkEagleInstallation } from "./utils/checkInstall";
import { showEagleNotOpenToast } from "./utils/error";
import { useFolderItemList, useFolderList } from "./utils/query";

function FolderItem({ folder }: { folder: Folder }) {
  return (
    <List.Item
      title={folder.name}
      icon={Icon.Finder}
      actions={
        <ActionPanel>
          <Action.Push title="Open Folder" target={<FolderView folder={folder} />} />
        </ActionPanel>
      }
    />
  );
}

function FolderView({ folder }: { folder: Folder }) {
  const subFolders = folder.children;

  const { data: items } = useFolderItemList(folder.id);

  const images = items.map((item) => <EagleItem key={item.id} item={item} />);

  return (
    <List>
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
  const { data: folders, isLoading, error } = useFolderList();

  checkEagleInstallation();

  if (error?.code === "ECONNREFUSED") {
    showEagleNotOpenToast();
  } else if (error) {
    console.error(error);
  }

  return (
    <List isLoading={isLoading}>
      <List.Section title="Folders">
        {folders.map((folder) => (
          <FolderItem key={folder.id} folder={folder} />
        ))}
      </List.Section>
    </List>
  );
}
