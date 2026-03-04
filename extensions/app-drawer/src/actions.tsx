import {
  Action,
  ActionPanel,
  Alert,
  Application,
  confirmAlert,
  Form,
  Grid,
  Icon,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { importFromLaunchpad } from "./launchpad";
import { DrawerConfig, Folder, GridEntry } from "./types";
import {
  createFolderWithApp,
  extractAppFromFolder,
  generateId,
  moveItem,
  removeAppFromCurrentLocation,
  sortByName,
} from "./utils";

// --- App ActionPanel (for app items in main grid or inside folders) ---

interface AppActionPanelProps {
  app: Application;
  config: DrawerConfig;
  updateConfig: (config: DrawerConfig) => void;
  appMap: Map<string, Application>;
  folderId: string | null;
  index: number;
  sectionLength: number;
  launchpadAvailable?: boolean;
}

export function AppActionPanel({
  app,
  config,
  updateConfig,
  appMap,
  folderId,
  index,
  sectionLength,
  launchpadAvailable,
}: AppActionPanelProps) {
  const { pop } = useNavigation();
  const bundleId = app.bundleId ?? "";
  const isInFolder = folderId !== null;

  function handleMove(direction: "up" | "down" | "top" | "bottom") {
    let toIndex: number;
    switch (direction) {
      case "up":
        toIndex = index - 1;
        break;
      case "down":
        toIndex = index + 1;
        break;
      case "top":
        toIndex = 0;
        break;
      case "bottom":
        toIndex = sectionLength - 1;
        break;
    }

    if (isInFolder) {
      const folders = config.folders.map((f) =>
        f.id === folderId ? { ...f, appBundleIds: moveItem(f.appBundleIds, index, toIndex) } : f,
      );
      updateConfig({ ...config, folders });
    } else {
      updateConfig({ ...config, gridOrder: moveItem(config.gridOrder, index, toIndex) });
    }
  }

  function handleSortAZ() {
    if (!isInFolder) return;
    const folders = config.folders.map((f) =>
      f.id === folderId ? { ...f, appBundleIds: sortByName(f.appBundleIds, appMap) } : f,
    );
    updateConfig({ ...config, folders });
    showToast({ style: Toast.Style.Success, title: "Sorted A-Z" });
  }

  function handleMoveToFolder(targetFolderId: string) {
    const newConfig = removeAppFromCurrentLocation(config, bundleId, folderId);
    const folders = newConfig.folders.map((f) =>
      f.id === targetFolderId ? { ...f, appBundleIds: [...f.appBundleIds, bundleId] } : f,
    );
    updateConfig({ ...newConfig, folders });
  }

  function handleCreateFolder() {
    updateConfig(createFolderWithApp(config, bundleId, folderId, generateId()));
    showToast({ style: Toast.Style.Success, title: 'Created folder "New Folder"' });
  }

  function handleRemoveFromFolder() {
    if (!folderId) return;
    updateConfig(extractAppFromFolder(config, bundleId, folderId));
    pop();
    showToast({ style: Toast.Style.Success, title: `Removed "${app.name}" from folder` });
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action title="Open Application" icon={Icon.ArrowRight} onAction={() => open(app.path)} />
      </ActionPanel.Section>

      <ActionPanel.Section title="Reorder">
        {index > 0 && (
          <Action
            title="Move up"
            icon={Icon.ArrowUp}
            shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
            onAction={() => handleMove("up")}
          />
        )}
        {index < sectionLength - 1 && (
          <Action
            title="Move Down"
            icon={Icon.ArrowDown}
            shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
            onAction={() => handleMove("down")}
          />
        )}
        {index > 0 && <Action title="Move to Top" icon={Icon.ArrowUpCircle} onAction={() => handleMove("top")} />}
        {index < sectionLength - 1 && (
          <Action title="Move to Bottom" icon={Icon.ArrowDownCircle} onAction={() => handleMove("bottom")} />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title="Folder">
        <ActionPanel.Submenu title="Move to Folder" icon={Icon.Folder}>
          {config.folders
            .filter((f) => f.id !== folderId)
            .map((f) => (
              <Action key={f.id} title={f.name} icon={Icon.Folder} onAction={() => handleMoveToFolder(f.id)} />
            ))}
          <Action title="New Folder…" icon={Icon.PlusCircle} onAction={handleCreateFolder} />
        </ActionPanel.Submenu>
        {isInFolder && <Action title="Remove from Folder" icon={Icon.ArrowRight} onAction={handleRemoveFromFolder} />}
        {isInFolder && <Action title="Sort Folder A-Z" icon={Icon.Text} onAction={handleSortAZ} />}
      </ActionPanel.Section>

      {launchpadAvailable && <ImportSection updateConfig={updateConfig} />}
    </ActionPanel>
  );
}

// --- Folder Detail View ---

interface FolderDetailProps {
  folder: Folder;
  config: DrawerConfig;
  updateConfig: (config: DrawerConfig) => void;
  appMap: Map<string, Application>;
  columns: number;
}

export function FolderDetail({ folder, config, updateConfig, appMap, columns }: FolderDetailProps) {
  // Re-resolve from config to stay in sync after mutations
  const currentFolder = config.folders.find((f) => f.id === folder.id);
  if (!currentFolder) return null;

  return (
    <Grid
      columns={columns}
      navigationTitle={currentFolder.name}
      searchBarPlaceholder={`Search in ${currentFolder.name}…`}
    >
      {currentFolder.appBundleIds.map((bundleId, index) => {
        const app = appMap.get(bundleId);
        if (!app) return null;
        return (
          <Grid.Item
            key={bundleId}
            content={{ fileIcon: app.path }}
            title={app.name}
            keywords={[app.name]}
            actions={
              <AppActionPanel
                app={app}
                config={config}
                updateConfig={updateConfig}
                appMap={appMap}
                folderId={currentFolder.id}
                index={index}
                sectionLength={currentFolder.appBundleIds.length}
              />
            }
          />
        );
      })}
    </Grid>
  );
}

// --- Folder Item ActionPanel (for folder items in main grid) ---

interface FolderItemActionPanelProps {
  folder: Folder;
  config: DrawerConfig;
  updateConfig: (config: DrawerConfig) => void;
  appMap: Map<string, Application>;
  columns: number;
  gridIndex: number;
  launchpadAvailable?: boolean;
}

export function FolderItemActionPanel({
  folder,
  config,
  updateConfig,
  appMap,
  columns,
  gridIndex,
  launchpadAvailable,
}: FolderItemActionPanelProps) {
  async function handleDeleteFolder() {
    if (
      await confirmAlert({
        title: `Delete "${folder.name}"?`,
        message: "Apps in this folder will be moved to the main grid.",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const appsToInsert: GridEntry[] = folder.appBundleIds.map((id) => ({ type: "app", bundleId: id }));
      const gridOrder = [...config.gridOrder];
      gridOrder.splice(gridIndex, 1, ...appsToInsert);
      updateConfig({
        ...config,
        folders: config.folders.filter((f) => f.id !== folder.id),
        gridOrder,
      });
      showToast({ style: Toast.Style.Success, title: `Deleted folder "${folder.name}"` });
    }
  }

  function handleMove(direction: "up" | "down") {
    const toIndex = direction === "up" ? gridIndex - 1 : gridIndex + 1;
    if (toIndex < 0 || toIndex >= config.gridOrder.length) return;
    updateConfig({ ...config, gridOrder: moveItem(config.gridOrder, gridIndex, toIndex) });
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.Push
          title="Open Folder"
          icon={Icon.Folder}
          target={
            <FolderDetail
              folder={folder}
              config={config}
              updateConfig={updateConfig}
              appMap={appMap}
              columns={columns}
            />
          }
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Folder">
        <Action.Push
          title="Rename Folder"
          icon={Icon.Pencil}
          target={<RenameFolderForm folder={folder} config={config} updateConfig={updateConfig} />}
        />
        <Action
          title="Delete Folder"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={handleDeleteFolder}
        />
        {gridIndex > 0 && (
          <Action
            title="Move Folder up"
            icon={Icon.ArrowUp}
            shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
            onAction={() => handleMove("up")}
          />
        )}
        {gridIndex < config.gridOrder.length - 1 && (
          <Action
            title="Move Folder Down"
            icon={Icon.ArrowDown}
            shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
            onAction={() => handleMove("down")}
          />
        )}
      </ActionPanel.Section>

      {launchpadAvailable && <ImportSection updateConfig={updateConfig} />}
    </ActionPanel>
  );
}

// --- Import Section (shared) ---

function ImportSection({ updateConfig }: { updateConfig: (c: DrawerConfig) => void }) {
  return (
    <ActionPanel.Section title="Import">
      <Action
        title="Import from Launchpad"
        icon={Icon.Download}
        onAction={async () => {
          if (
            await confirmAlert({
              title: "Import from Launchpad?",
              message: "This will replace your current layout with the Launchpad layout.",
              primaryAction: { title: "Import", style: Alert.ActionStyle.Destructive },
            })
          ) {
            try {
              updateConfig(importFromLaunchpad());
              showToast({ style: Toast.Style.Success, title: "Imported from Launchpad" });
            } catch (e) {
              showToast({
                style: Toast.Style.Failure,
                title: "Import Failed",
                message: e instanceof Error ? e.message : "Unknown error",
              });
            }
          }
        }}
      />
    </ActionPanel.Section>
  );
}

// --- Rename Folder Form ---

function RenameFolderForm({
  folder,
  config,
  updateConfig,
}: {
  folder: Folder;
  config: DrawerConfig;
  updateConfig: (config: DrawerConfig) => void;
}) {
  const { pop } = useNavigation();

  function handleSubmit(values: { name: string }) {
    const trimmed = values.name.trim();
    if (!trimmed) {
      showToast({ style: Toast.Style.Failure, title: "Folder name cannot be empty" });
      return;
    }
    updateConfig({ ...config, folders: config.folders.map((f) => (f.id === folder.id ? { ...f, name: trimmed } : f)) });
    showToast({ style: Toast.Style.Success, title: `Renamed to "${trimmed}"` });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Folder Name" defaultValue={folder.name} />
    </Form>
  );
}
