import {
  Action,
  ActionPanel,
  Alert,
  getPreferenceValues,
  Icon,
  List,
  LocalStorage,
  Toast,
  confirmAlert,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { CreateBookmarkFolderForm } from "./components/create-bookmark-folder-form";
import { deleteBookmarkFolder, loadBookmarkFolders } from "./lib/bookmarks";
import {
  COLOR_KEY,
  COLOR_OPTIONS,
  DEFAULT_FOLDER,
  GRID_SIZE_KEY,
  GRID_SIZE_OPTIONS,
  QUICK_ACTION_KEY,
  QUICK_ACTION_OPTIONS,
  getColorName,
  getFolderColor,
  getFolderIcon,
  getQuickActionName,
  isQuickActionPreferenceValue,
} from "./lib/constants";
import type { BookmarkFolder, QuickActionPreference } from "./lib/types";

export default function Command() {
  const { quickAction } = getPreferenceValues<Preferences>();
  const [selectedColor, setSelectedColor] = useState("auto");
  const [selectedGridSize, setSelectedGridSize] = useState("8");
  const [selectedQuickAction, setSelectedQuickAction] = useState<QuickActionPreference>(quickAction ?? "view-styles");
  const [hasQuickActionOverride, setHasQuickActionOverride] = useState(false);
  const [bookmarkFolders, setBookmarkFolders] = useState<BookmarkFolder[]>([]);

  const loadData = useCallback(async () => {
    const [folders, storedColor, storedGridSize, storedQuickAction] = await Promise.all([
      loadBookmarkFolders(),
      LocalStorage.getItem<string>(COLOR_KEY),
      LocalStorage.getItem<string>(GRID_SIZE_KEY),
      LocalStorage.getItem<string>(QUICK_ACTION_KEY),
    ]);

    setBookmarkFolders(folders);
    setSelectedColor(storedColor ?? "auto");
    setSelectedGridSize(storedGridSize ?? "8");
    setSelectedQuickAction(
      isQuickActionPreferenceValue(storedQuickAction) ? storedQuickAction : (quickAction ?? "view-styles"),
    );
    setHasQuickActionOverride(isQuickActionPreferenceValue(storedQuickAction));
  }, [quickAction]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function changeColor(color: string) {
    setSelectedColor(color);
    await LocalStorage.setItem(COLOR_KEY, color);
    await showToast({ style: Toast.Style.Success, title: `Default color: ${getColorName(color)}` });
  }

  async function changeGridSize(size: string) {
    setSelectedGridSize(size);
    await LocalStorage.setItem(GRID_SIZE_KEY, size);
    const sizeName = GRID_SIZE_OPTIONS.find((option) => option.value === size)?.name ?? size;
    await showToast({ style: Toast.Style.Success, title: `Grid size: ${sizeName}` });
  }

  async function changeQuickAction(action: QuickActionPreference) {
    setSelectedQuickAction(action);
    setHasQuickActionOverride(true);
    await LocalStorage.setItem(QUICK_ACTION_KEY, action);
    await showToast({ style: Toast.Style.Success, title: `Primary action: ${getQuickActionName(action)}` });
  }

  async function resetQuickAction() {
    const defaultQuickAction = quickAction ?? "view-styles";
    setSelectedQuickAction(defaultQuickAction);
    setHasQuickActionOverride(false);
    await LocalStorage.removeItem(QUICK_ACTION_KEY);
    await showToast({
      style: Toast.Style.Success,
      title: `Primary action: ${getQuickActionName(defaultQuickAction)}`,
      message: "Using the extension default again",
    });
  }

  async function handleDeleteFolder(folderId: string) {
    if (folderId === DEFAULT_FOLDER.id) {
      await showToast({ style: Toast.Style.Failure, title: "Cannot delete Favorites folder" });
      return;
    }

    const folder = bookmarkFolders.find((item) => item.id === folderId);
    const confirmed = await confirmAlert({
      title: `Delete "${folder?.name}" Folder`,
      message: `Are you sure you want to delete this folder and its ${folder?.icons.length ?? 0} icons?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteBookmarkFolder(folderId);
      await loadData();
      await showToast({ style: Toast.Style.Success, title: "Folder deleted" });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't delete folder",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const currentColorName = getColorName(selectedColor);
  const currentGridSizeName = GRID_SIZE_OPTIONS.find((option) => option.value === selectedGridSize)?.name ?? "Small";
  const currentQuickActionName = getQuickActionName(selectedQuickAction);

  return (
    <List navigationTitle="Hugeicons UI Preferences">
      <List.Section title="Display">
        <List.Item
          icon={Icon.AppWindowGrid3x3}
          title="Grid Size"
          subtitle={currentGridSizeName}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Select Grid Size">
                {GRID_SIZE_OPTIONS.map((size) => (
                  <Action
                    key={size.value}
                    title={size.name}
                    icon={selectedGridSize === size.value ? Icon.CheckCircle : Icon.Circle}
                    onAction={() => changeGridSize(size.value)}
                  />
                ))}
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
        <List.Item
          icon={{
            source: Icon.CircleFilled,
            tintColor: COLOR_OPTIONS.find((option) => option.value === selectedColor)?.raycastColor,
          }}
          title="Default Icon Color"
          subtitle={currentColorName}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Select Color">
                {COLOR_OPTIONS.map((color) => (
                  <Action
                    key={color.value}
                    title={color.name}
                    icon={{
                      source: selectedColor === color.value ? Icon.CheckCircle : Icon.Circle,
                      tintColor: color.raycastColor,
                    }}
                    onAction={() => changeColor(color.value)}
                  />
                ))}
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Search">
        <List.Item
          icon={Icon.Bolt}
          title="Primary Search Action"
          subtitle={currentQuickActionName}
          accessories={[{ text: hasQuickActionOverride ? "Managed Here" : "Extension Default" }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Select Primary Action">
                {QUICK_ACTION_OPTIONS.map((action) => (
                  <Action
                    key={action.value}
                    title={action.name}
                    icon={selectedQuickAction === action.value ? Icon.CheckCircle : Icon.Circle}
                    onAction={() => changeQuickAction(action.value)}
                  />
                ))}
              </ActionPanel.Section>
              {hasQuickActionOverride && (
                <Action title="Use Extension Default" icon={Icon.ArrowCounterClockwise} onAction={resetQuickAction} />
              )}
              <Action title="Open Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Bookmarks">
        <List.Item
          icon={Icon.PlusCircle}
          title="Create New Folder"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create New Folder"
                icon={Icon.Plus}
                target={<CreateBookmarkFolderForm onFolderCreated={loadData} />}
              />
            </ActionPanel>
          }
        />
        {bookmarkFolders.map((folder) => (
          <List.Item
            key={folder.id}
            icon={{
              source: getFolderIcon(folder.icon),
              tintColor: getFolderColor(folder.color),
            }}
            title={folder.name}
            subtitle={`${folder.icons.length} icon${folder.icons.length === 1 ? "" : "s"}`}
            actions={
              <ActionPanel>
                {folder.id !== DEFAULT_FOLDER.id && (
                  <Action
                    title="Delete Folder"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDeleteFolder(folder.id)}
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Account">
        <List.Item
          icon={Icon.Key}
          title="API Key"
          subtitle="••••••••"
          accessories={[{ text: "Extension Settings" }]}
          actions={
            <ActionPanel>
              <Action title="Open Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
