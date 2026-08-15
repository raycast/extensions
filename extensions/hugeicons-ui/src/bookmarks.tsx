import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Detail,
  Form,
  Grid,
  Icon,
  LocalStorage,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { CreateBookmarkFolderForm } from "./components/create-bookmark-folder-form";
import {
  addIconToFolder,
  deleteBookmarkFolder,
  loadBookmarkFolders as loadBookmarks,
  removeIconFromFolder,
  updateBookmarkFolder,
} from "./lib/bookmarks";
import {
  COLOR_KEY,
  COLOR_OPTIONS,
  DEFAULT_FOLDER,
  FOLDER_COLOR_OPTIONS,
  FOLDER_ICON_OPTIONS,
  GRID_SIZE_KEY,
  LAST_FOLDER_KEY,
  PNG_EXPORT_SUPPORTED,
  getColorName,
  getFolderColor,
  getFolderIcon,
} from "./lib/constants";
import { copyPng, downloadPng, downloadSvg } from "./lib/icon-export";
import { colorSvg, svgToDataUri, svgToJsx, svgToSvelte, svgToVue } from "./lib/icon-utils";
import type { BookmarkFolder, HugeIcon } from "./lib/types";

async function copyTextWithHUD(content: string, message: string): Promise<void> {
  await Clipboard.copy(content);
  await showHUD(message);
}

function EditFolderForm({
  folder,
  onFolderUpdated,
  onFolderDeleted,
}: {
  folder: BookmarkFolder;
  onFolderUpdated: () => void;
  onFolderDeleted?: () => void;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState(folder.name);
  const [color, setColor] = useState(folder.color);
  const [folderIcon, setFolderIcon] = useState(folder.icon || "Folder");

  async function handleSubmit() {
    try {
      const updatedFolder = await updateBookmarkFolder(folder.id, {
        name,
        color,
        icon: folderIcon,
      });

      await showToast({ style: Toast.Style.Success, title: `Updated "${updatedFolder.name}" folder` });
      onFolderUpdated();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't update folder",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleDelete() {
    const confirmed = await confirmAlert({
      title: "Delete Folder",
      message: `Are you sure you want to delete "${folder.name}"? This will remove all ${folder.icons.length} icons in this folder.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    try {
      await deleteBookmarkFolder(folder.id);
      await showToast({ style: Toast.Style.Success, title: `Deleted "${folder.name}" folder` });
      if (onFolderDeleted) onFolderDeleted();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't delete folder",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      navigationTitle="Edit Bookmark Folder"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
          {folder.id !== DEFAULT_FOLDER.id && (
            <Action
              title="Delete Folder"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
              onAction={handleDelete}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Folder Name" placeholder="My Icons" value={name} onChange={setName} />
      <Form.Dropdown id="icon" title="Folder Icon" value={folderIcon} onChange={setFolderIcon}>
        {FOLDER_ICON_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.name} icon={opt.icon} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="color" title="Folder Color" value={color} onChange={setColor}>
        {FOLDER_COLOR_OPTIONS.map((c) => (
          <Form.Dropdown.Item
            key={c.value}
            value={c.value}
            title={c.name}
            icon={{ source: Icon.Circle, tintColor: c.raycastColor }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function IconPreview({
  icon,
  selectedColor,
  onColorChange,
}: {
  icon: HugeIcon;
  selectedColor: string;
  onColorChange: (color: string) => void;
}) {
  const coloredSvg = colorSvg(icon.svg, selectedColor);
  const currentColorName = getColorName(selectedColor);

  const markdown = `
# ${icon.name}

![${icon.name}](${svgToDataUri(icon.svg, selectedColor)}?raycast-width=200&raycast-height=200)

**Color:** ${currentColorName}
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={icon.name}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Download">
            <Action
              title="Download SVG"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={() => downloadSvg(coloredSvg, icon.name)}
            />
            {PNG_EXPORT_SUPPORTED && (
              <Action
                title="Download Png"
                icon={Icon.Download}
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                onAction={() => downloadPng(coloredSvg, icon.name)}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action
              title="Copy SVG"
              icon={Icon.Clipboard}
              onAction={() => copyTextWithHUD(coloredSvg, `Copied ${icon.name} as SVG`)}
            />
            {PNG_EXPORT_SUPPORTED && (
              <Action
                title="Copy Png"
                icon={Icon.Image}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                onAction={() => copyPng(coloredSvg)}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy as Component">
            <Action
              title="React (Jsx)"
              icon={Icon.Code}
              onAction={() =>
                copyTextWithHUD(svgToJsx(icon.svg, icon.name, selectedColor), `Copied ${icon.name} as React JSX`)
              }
            />
            <Action
              title="Vue (Sfc)"
              icon={Icon.Code}
              onAction={() =>
                copyTextWithHUD(svgToVue(icon.svg, icon.name, selectedColor), `Copied ${icon.name} as Vue SFC`)
              }
            />
            <Action
              title="Svelte"
              icon={Icon.Code}
              onAction={() =>
                copyTextWithHUD(svgToSvelte(icon.svg, icon.name, selectedColor), `Copied ${icon.name} as Svelte`)
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Icon Color">
            {COLOR_OPTIONS.map((color) => (
              <Action
                key={color.value}
                title={color.name}
                icon={{
                  source: selectedColor === color.value ? Icon.CheckCircle : Icon.Circle,
                  tintColor: color.raycastColor,
                }}
                onAction={() => onColorChange(color.value)}
              />
            ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { gridSize, defaultColor } = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState(DEFAULT_FOLDER.id);
  const [selectedColor, setSelectedColor] = useState<string>(defaultColor || "auto");
  const [columns, setColumns] = useState(parseInt(gridSize) || 8);

  const loadData = useCallback(async () => {
    const [loadedFolders, storedColor, storedGridSize, lastFolder] = await Promise.all([
      loadBookmarks(),
      LocalStorage.getItem<string>(COLOR_KEY),
      LocalStorage.getItem<string>(GRID_SIZE_KEY),
      LocalStorage.getItem<string>(LAST_FOLDER_KEY),
    ]);
    setFolders(loadedFolders);
    setSelectedColor(storedColor || defaultColor || "auto");
    setColumns(parseInt(storedGridSize || gridSize) || 8);
    if (lastFolder && loadedFolders.find((f) => f.id === lastFolder)) {
      setSelectedFolderId(lastFolder);
    }
    setIsLoading(false);
  }, [defaultColor, gridSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFolderChange = useCallback(async (folderId: string) => {
    setSelectedFolderId(folderId);
    await LocalStorage.setItem(LAST_FOLDER_KEY, folderId);
  }, []);

  const handleColorChange = useCallback(async (color: string) => {
    setSelectedColor(color);
    await LocalStorage.setItem(COLOR_KEY, color);
    await showToast({ style: Toast.Style.Success, title: `Color: ${getColorName(color)}` });
  }, []);

  const removeIcon = useCallback(
    async (icon: HugeIcon) => {
      const confirmed = await confirmAlert({
        title: "Remove Icon",
        message: `Are you sure you want to remove "${icon.name}" from this folder?`,
        primaryAction: {
          title: "Remove",
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (!confirmed) return;
      await removeIconFromFolder(icon.name, selectedFolderId);
      await loadData();
      await showToast({ style: Toast.Style.Success, title: "Removed from folder" });
    },
    [selectedFolderId, loadData],
  );

  const moveIconToFolder = useCallback(
    async (icon: HugeIcon, targetFolderId: string) => {
      await removeIconFromFolder(icon.name, selectedFolderId);
      await addIconToFolder(icon, targetFolderId);
      await loadData();
      const targetFolder = folders.find((f) => f.id === targetFolderId);
      await showToast({ style: Toast.Style.Success, title: `Moved to ${targetFolder?.name || "folder"}` });
    },
    [selectedFolderId, loadData, folders],
  );

  const deleteFolder = useCallback(
    async (folderId: string) => {
      if (folderId === DEFAULT_FOLDER.id) {
        await showToast({ style: Toast.Style.Failure, title: "Cannot delete Favorites folder" });
        return;
      }
      const folder = folders.find((f) => f.id === folderId);
      const confirmed = await confirmAlert({
        title: "Delete Folder",
        message: `Are you sure you want to delete "${folder?.name}"? This will remove all ${folder?.icons.length || 0} icons in this folder.`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (!confirmed) return;

      try {
        await deleteBookmarkFolder(folderId);
        await loadData();

        if (selectedFolderId === folderId) {
          setSelectedFolderId(DEFAULT_FOLDER.id);
          await LocalStorage.setItem(LAST_FOLDER_KEY, DEFAULT_FOLDER.id);
        }

        await showToast({ style: Toast.Style.Success, title: "Folder deleted" });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn't delete folder",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [folders, loadData, selectedFolderId],
  );

  const selectedFolder = folders.find((f) => f.id === selectedFolderId) || folders[0];

  const filteredIcons = useMemo(() => {
    if (!selectedFolder) return [];
    if (!searchText.trim()) {
      return selectedFolder.icons;
    }
    const query = searchText.toLowerCase();
    return selectedFolder.icons.filter((icon) => icon.name.toLowerCase().includes(query));
  }, [selectedFolder, searchText]);

  const currentColorName = getColorName(selectedColor);

  const renderIconItem = (icon: HugeIcon) => {
    const coloredSvg = colorSvg(icon.svg, selectedColor);
    return (
      <Grid.Item
        key={icon.name}
        content={{
          source: svgToDataUri(icon.svg, selectedColor),
          tooltip: icon.name,
        }}
        title={icon.name}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.Push
                title="View Large Preview"
                icon={Icon.Eye}
                target={<IconPreview icon={icon} selectedColor={selectedColor} onColorChange={handleColorChange} />}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Copy SVG"
                icon={Icon.Clipboard}
                onAction={() => copyTextWithHUD(coloredSvg, `Copied ${icon.name} as SVG`)}
              />
              <Action.Paste title="Paste SVG" content={coloredSvg} />
            </ActionPanel.Section>
            <ActionPanel.Section title="Copy as Component">
              <Action
                title="React (Jsx)"
                icon={Icon.Code}
                onAction={() =>
                  copyTextWithHUD(svgToJsx(icon.svg, icon.name, selectedColor), `Copied ${icon.name} as React JSX`)
                }
              />
              <Action
                title="Vue (Sfc)"
                icon={Icon.Code}
                onAction={() =>
                  copyTextWithHUD(svgToVue(icon.svg, icon.name, selectedColor), `Copied ${icon.name} as Vue SFC`)
                }
              />
              <Action
                title="Svelte"
                icon={Icon.Code}
                onAction={() =>
                  copyTextWithHUD(svgToSvelte(icon.svg, icon.name, selectedColor), `Copied ${icon.name} as Svelte`)
                }
              />
            </ActionPanel.Section>
            <ActionPanel.Section title="Download">
              <Action
                title="Download SVG"
                icon={Icon.Download}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                onAction={() => downloadSvg(coloredSvg, icon.name)}
              />
              {PNG_EXPORT_SUPPORTED && (
                <Action
                  title="Copy Png"
                  icon={Icon.Image}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  onAction={() => copyPng(coloredSvg)}
                />
              )}
              {PNG_EXPORT_SUPPORTED && (
                <Action
                  title="Download Png"
                  icon={Icon.Download}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                  onAction={() => downloadPng(coloredSvg, icon.name)}
                />
              )}
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Remove from Folder"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                onAction={() => removeIcon(icon)}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title="Move to...">
              {folders
                .filter((f) => f.id !== selectedFolderId)
                .map((folder) => (
                  <Action
                    key={folder.id}
                    title={folder.name}
                    icon={{
                      source: getFolderIcon(folder.icon),
                      tintColor: getFolderColor(folder.color),
                    }}
                    onAction={() => moveIconToFolder(icon, folder.id)}
                  />
                ))}
            </ActionPanel.Section>
            <ActionPanel.Section title="Folder">
              <Action.Push
                title="Create New Folder"
                icon={Icon.PlusCircle}
                target={<CreateBookmarkFolderForm onFolderCreated={loadData} />}
              />
              {selectedFolder && (
                <Action.Push
                  title="Edit Folder"
                  icon={Icon.Pencil}
                  target={
                    <EditFolderForm folder={selectedFolder} onFolderUpdated={loadData} onFolderDeleted={loadData} />
                  }
                />
              )}
              {selectedFolderId !== DEFAULT_FOLDER.id && (
                <Action
                  title="Delete Folder"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => deleteFolder(selectedFolderId)}
                />
              )}
            </ActionPanel.Section>
            <ActionPanel.Section title="Icon Color">
              {COLOR_OPTIONS.map((color) => (
                <Action
                  key={color.value}
                  title={color.name}
                  icon={{
                    source: selectedColor === color.value ? Icon.CheckCircle : Icon.Circle,
                    tintColor: color.raycastColor,
                  }}
                  onAction={() => handleColorChange(color.value)}
                />
              ))}
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  const showEmptyState = selectedFolder && selectedFolder.icons.length === 0;
  const showNoResults = searchText.trim() && filteredIcons.length === 0;

  return (
    <Grid
      columns={columns}
      inset={Grid.Inset.Large}
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Search in ${selectedFolder?.name || "folder"}...`}
      filtering={false}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Bookmark Folder" value={selectedFolderId} onChange={handleFolderChange}>
          <Grid.Dropdown.Section title="Folders">
            {folders.map((folder) => (
              <Grid.Dropdown.Item
                key={folder.id}
                value={folder.id}
                title={`${folder.name} (${folder.icons.length})`}
                icon={{
                  source: getFolderIcon(folder.icon),
                  tintColor: getFolderColor(folder.color),
                }}
              />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {showEmptyState && (
        <Grid.EmptyView
          icon={{
            source: getFolderIcon(selectedFolder?.icon),
            tintColor: getFolderColor(selectedFolder?.color || "Yellow"),
          }}
          title={`No icons in ${selectedFolder?.name}`}
          description="Add icons to this folder from the Browse Hugeicons command"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create New Folder"
                icon={Icon.Plus}
                target={<CreateBookmarkFolderForm onFolderCreated={loadData} />}
              />
              {selectedFolder && (
                <Action.Push
                  title="Edit Folder"
                  icon={Icon.Pencil}
                  target={
                    <EditFolderForm folder={selectedFolder} onFolderUpdated={loadData} onFolderDeleted={loadData} />
                  }
                />
              )}
              {selectedFolderId !== DEFAULT_FOLDER.id && (
                <Action
                  title="Delete Folder"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => deleteFolder(selectedFolderId)}
                />
              )}
            </ActionPanel>
          }
        />
      )}
      {showNoResults && (
        <Grid.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No matches found"
          description="Try a different search term"
        />
      )}
      {!showEmptyState && !showNoResults && (
        <Grid.Section title={`${selectedFolder?.name} (${filteredIcons.length}) • ${currentColorName}`}>
          {filteredIcons.map((icon) => renderIconItem(icon))}
        </Grid.Section>
      )}
    </Grid>
  );
}
