import {
  List,
  ActionPanel,
  Action,
  Clipboard,
  showToast,
  Toast,
  Icon,
  popToRoot,
  showInFinder,
  Alert,
  confirmAlert,
} from "@raycast/api";
import path from "path";
import { FoldersProvider, useFolders } from "./components/folder-context";
import { statSync, readdirSync } from "fs";
import { ActionAddFolder } from "./components/action-add-folder";
import { Folder } from "./type";
function countImagesInFolder(folder: Folder): number {
  try {
    let count = 0;
    const files = readdirSync(folder.path);

    for (const file of files) {
      const filePath = path.join(folder.path, file);
      const stats = statSync(filePath);

      if (stats.isFile()) {
        const ext = path.extname(file).toLowerCase();
        if ([".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico"].includes(ext)) {
          count++;
        }
      } else if (stats.isDirectory() && folder.recursive) {
        count += countImagesInFolder({
          path: filePath,
          recursive: folder.recursive,
        });
      }
    }
    return count;
  } catch (error) {
    console.error("Error counting images in folder:", error);
    return 0;
  }
}

function ManageFolders() {
  const { folders, isLoading, removeFolder } = useFolders();
  const folderList = folders.map((folder) => ({
    path: folder.path,
    name: path.basename(folder.path),
    imageCount: countImagesInFolder(folder),
    recursive: folder.recursive,
  }));

  const handleCopy = async (folderPath: string) => {
    await Clipboard.copy({ text: folderPath });
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard",
      message: folderPath,
    });
    popToRoot();
  };

  const handleOpen = async (folderPath: string) => {
    await showInFinder(folderPath);
  };

  const handleRemove = async (folderPath: string) => {
    const confirmed = await confirmAlert({
      title: "Remove Folder",
      message: `Are you sure you want to remove "${path.basename(folderPath)}"?`,
      icon: Icon.Trash,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await removeFolder(folderPath);
      await showToast({
        style: Toast.Style.Success,
        title: "Folder removed",
        message: folderPath,
      });
    }
  };

  return (
    <List isLoading={isLoading} navigationTitle="Manage Icon Folders" searchBarPlaceholder="Search folders...">
      <List.Item
        title="Add New Folder"
        icon={Icon.Plus}
        accessories={[]}
        actions={
          <ActionPanel>
            <ActionAddFolder />
          </ActionPanel>
        }
      />
      {folderList.map((folder) => (
        <List.Item
          key={folder.path}
          title={folder.path}
          accessories={[
            { text: `${folder.imageCount} images` },
            {
              icon: folder.recursive ? Icon.NewFolder : Icon.Folder,
              tooltip: folder.recursive ? "Recursive" : "Non-recursive",
            },
          ]}
          actions={
            <ActionPanel>
              <Action title="Copy Path" icon={Icon.CopyClipboard} onAction={() => handleCopy(folder.path)} />
              <Action title="Show in Finder" icon={Icon.Finder} onAction={() => handleOpen(folder.path)} />
              <Action
                title="Remove Folder"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleRemove(folder.path)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command() {
  return (
    <FoldersProvider>
      <ManageFolders />
    </FoldersProvider>
  );
}
