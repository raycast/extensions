import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ActionPanel,
  Action,
  Grid,
  Detail,
  Form,
  showToast,
  Toast,
  environment,
  LocalStorage,
  Icon,
  Color,
  Clipboard,
  showHUD,
  getPreferenceValues,
  useNavigation,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { homedir } from "os";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface Preferences {
  apiKey: string;
  gridSize: string;
  defaultColor: string;
}

interface HugeIcon {
  name: string;
  svg: string;
}

interface BookmarkFolder {
  id: string;
  name: string;
  color: string;
  icon?: string;
  icons: HugeIcon[];
}

interface ColorOption {
  name: string;
  value: string;
  raycastColor?: Color;
}

const BOOKMARKS_KEY = "hugeicons-bookmarks";
const COLOR_KEY = "hugeicons-color";
const GRID_SIZE_KEY = "hugeicons-grid-size";
const LAST_FOLDER_KEY = "hugeicons-last-folder";
const DOWNLOADS_PATH = join(homedir(), "Downloads");

const COLOR_OPTIONS: ColorOption[] = [
  { name: "Auto", value: "auto", raycastColor: Color.PrimaryText },
  { name: "White", value: "#FFFFFF", raycastColor: Color.PrimaryText },
  { name: "Black", value: "#000000", raycastColor: Color.SecondaryText },
  { name: "Red", value: "#FF3B30", raycastColor: Color.Red },
  { name: "Orange", value: "#FF9500", raycastColor: Color.Orange },
  { name: "Yellow", value: "#FFCC00", raycastColor: Color.Yellow },
  { name: "Green", value: "#34C759", raycastColor: Color.Green },
  { name: "Blue", value: "#007AFF", raycastColor: Color.Blue },
  { name: "Purple", value: "#AF52DE", raycastColor: Color.Purple },
  { name: "Magenta", value: "#FF2D55", raycastColor: Color.Magenta },
];

const FOLDER_COLORS: ColorOption[] = [
  { name: "Red", value: "Red", raycastColor: Color.Red },
  { name: "Orange", value: "Orange", raycastColor: Color.Orange },
  { name: "Yellow", value: "Yellow", raycastColor: Color.Yellow },
  { name: "Green", value: "Green", raycastColor: Color.Green },
  { name: "Blue", value: "Blue", raycastColor: Color.Blue },
  { name: "Purple", value: "Purple", raycastColor: Color.Purple },
  { name: "Magenta", value: "Magenta", raycastColor: Color.Magenta },
];

const FOLDER_ICON_OPTIONS = [
  { name: "Folder", value: "Folder", icon: Icon.Folder },
  { name: "Star", value: "Star", icon: Icon.Star },
  { name: "Heart", value: "Heart", icon: Icon.Heart },
  { name: "Bookmark", value: "Bookmark", icon: Icon.Bookmark },
  { name: "Tag", value: "Tag", icon: Icon.Tag },
  { name: "Box", value: "Box", icon: Icon.Box },
  { name: "Document", value: "Document", icon: Icon.Document },
  { name: "Code", value: "Code", icon: Icon.Code },
  { name: "Globe", value: "Globe", icon: Icon.Globe },
  { name: "Person", value: "Person", icon: Icon.Person },
  { name: "Building", value: "Building", icon: Icon.Building },
  { name: "Cart", value: "Cart", icon: Icon.Cart },
  { name: "Game", value: "GameController", icon: Icon.GameController },
  { name: "Music", value: "Music", icon: Icon.Music },
  { name: "Video", value: "Video", icon: Icon.Video },
  { name: "Camera", value: "Camera", icon: Icon.Camera },
  { name: "Brush", value: "Brush", icon: Icon.Brush },
  { name: "Hammer", value: "Hammer", icon: Icon.Hammer },
  { name: "Gear", value: "Gear", icon: Icon.Gear },
  { name: "Lightning", value: "LightBulb", icon: Icon.LightBulb },
];

const FOLDER_ICONS: Record<string, Icon> = FOLDER_ICON_OPTIONS.reduce(
  (acc, opt) => ({ ...acc, [opt.value]: opt.icon }),
  {} as Record<string, Icon>,
);

const DEFAULT_FOLDER: BookmarkFolder = {
  id: "favorites",
  name: "Favorites",
  color: "Yellow",
  icon: "Star",
  icons: [],
};

function getFolderColor(colorName: string): Color {
  const found = FOLDER_COLORS.find((c) => c.value === colorName);
  return found?.raycastColor || Color.Yellow;
}

function getDisplayColor(colorValue: string): string {
  if (colorValue === "auto") {
    return environment.appearance === "dark" ? "#FFFFFF" : "#000000";
  }
  return colorValue;
}

function colorSvg(svg: string, colorValue: string): string {
  const color = getDisplayColor(colorValue);
  return svg
    .replace(/stroke="#[0-9A-Fa-f]{6}"/g, `stroke="${color}"`)
    .replace(/fill="#[0-9A-Fa-f]{6}"/g, `fill="${color}"`);
}

function svgToDataUri(svg: string, colorValue: string): string {
  const coloredSvg = colorSvg(svg, colorValue);
  const encoded = encodeURIComponent(coloredSvg);
  return `data:image/svg+xml,${encoded}`;
}

function svgToJsx(svg: string, componentName: string, colorValue: string): string {
  const coloredSvg = colorSvg(svg, colorValue);
  const jsxSvg = coloredSvg
    .replace(/class=/g, "className=")
    .replace(/stroke-width=/g, "strokeWidth=")
    .replace(/stroke-linecap=/g, "strokeLinecap=")
    .replace(/stroke-linejoin=/g, "strokeLinejoin=")
    .replace(/fill-rule=/g, "fillRule=")
    .replace(/clip-rule=/g, "clipRule=")
    .replace(/clip-path=/g, "clipPath=")
    .replace(/stroke-miterlimit=/g, "strokeMiterlimit=")
    .replace(/stroke-dasharray=/g, "strokeDasharray=")
    .replace(/stroke-dashoffset=/g, "strokeDashoffset=")
    .replace(/fill-opacity=/g, "fillOpacity=")
    .replace(/stroke-opacity=/g, "strokeOpacity=");

  const pascalName = componentName
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");

  return `const ${pascalName}Icon = (props) => (
  ${jsxSvg.replace("<svg", "<svg {...props}")}
);

export default ${pascalName}Icon;`;
}

function svgToVue(svg: string, componentName: string, colorValue: string): string {
  const coloredSvg = colorSvg(svg, colorValue);
  const pascalName = componentName
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");

  return `<template>
  ${coloredSvg.replace("<svg", '<svg v-bind="$attrs"')}
</template>

<script>
export default {
  name: '${pascalName}Icon',
  inheritAttrs: false
}
</script>`;
}

function svgToSvelte(svg: string, componentName: string, colorValue: string): string {
  const coloredSvg = colorSvg(svg, colorValue);

  return `<script>
  export let size = 24;
  export let color = "currentColor";
</script>

${coloredSvg.replace("<svg", "<svg {...$$restProps} width={size} height={size}")}`;
}

async function svgToPng(svg: string, outputPath: string, size: number = 256): Promise<void> {
  if (process.platform !== "darwin") {
    throw new Error("PNG export is only available on macOS");
  }

  const resizedSvg = svg.replace(/width="24"/, `width="${size}"`).replace(/height="24"/, `height="${size}"`);

  const tempSvgPath = join(environment.supportPath, "temp-icon.svg");
  await writeFile(tempSvgPath, resizedSvg, "utf-8");

  try {
    await execAsync(`/usr/bin/qlmanage -t -s ${size} -o "${environment.supportPath}" "${tempSvgPath}"`);
    const generatedPng = `${tempSvgPath}.png`;
    await execAsync(`mv "${generatedPng}" "${outputPath}"`);
  } finally {
    try {
      await unlink(tempSvgPath);
    } catch {
      // ignore
    }
  }
}

async function downloadSvg(svg: string, name: string): Promise<void> {
  const filePath = join(DOWNLOADS_PATH, `${name}.svg`);
  await writeFile(filePath, svg, "utf-8");
  await showHUD(`Saved to Downloads/${name}.svg`);
}

async function downloadPng(svg: string, name: string, size: number = 256): Promise<void> {
  await svgToPng(svg, join(DOWNLOADS_PATH, `${name}.png`), size);
  await showHUD(`Saved to Downloads/${name}.png`);
}

async function copyPng(svg: string, size: number = 256): Promise<void> {
  const tempPath = join(environment.supportPath, "clipboard-icon.png");
  await svgToPng(svg, tempPath, size);
  await Clipboard.copy({ file: tempPath });
  await showHUD("PNG copied to clipboard");
}

export async function loadBookmarks(): Promise<BookmarkFolder[]> {
  const stored = await LocalStorage.getItem<string>(BOOKMARKS_KEY);
  if (stored) {
    try {
      const folders = JSON.parse(stored) as BookmarkFolder[];
      if (folders.length === 0 || !folders.find((f) => f.id === "favorites")) {
        return [DEFAULT_FOLDER, ...folders.filter((f) => f.id !== "favorites")];
      }
      return folders;
    } catch {
      return [DEFAULT_FOLDER];
    }
  }
  return [DEFAULT_FOLDER];
}

export async function saveBookmarks(folders: BookmarkFolder[]): Promise<void> {
  await LocalStorage.setItem(BOOKMARKS_KEY, JSON.stringify(folders));
}

export async function addIconToFolder(icon: HugeIcon, folderId: string): Promise<void> {
  const folders = await loadBookmarks();
  const folderIndex = folders.findIndex((f) => f.id === folderId);
  if (folderIndex >= 0) {
    const folder = folders[folderIndex];
    if (!folder.icons.find((i) => i.name === icon.name)) {
      folder.icons.push(icon);
      await saveBookmarks(folders);
    }
  }
}

export async function removeIconFromFolder(iconName: string, folderId: string): Promise<void> {
  const folders = await loadBookmarks();
  const folderIndex = folders.findIndex((f) => f.id === folderId);
  if (folderIndex >= 0) {
    folders[folderIndex].icons = folders[folderIndex].icons.filter((i) => i.name !== iconName);
    await saveBookmarks(folders);
  }
}

function CreateFolderForm({ onFolderCreated }: { onFolderCreated: () => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [color, setColor] = useState("Blue");
  const [folderIcon, setFolderIcon] = useState("Folder");

  async function handleSubmit() {
    if (!name.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Please enter a folder name" });
      return;
    }

    const folders = await loadBookmarks();
    const id = `folder-${Date.now()}`;
    folders.push({ id, name: name.trim(), color, icon: folderIcon, icons: [] });
    await saveBookmarks(folders);
    await showToast({ style: Toast.Style.Success, title: `Created "${name}" folder` });
    onFolderCreated();
    pop();
  }

  return (
    <Form
      navigationTitle="Create Bookmark Folder"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Folder" icon={Icon.Plus} onSubmit={handleSubmit} />
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
        {FOLDER_COLORS.map((c) => (
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
    if (!name.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Please enter a folder name" });
      return;
    }

    const folders = await loadBookmarks();
    const folderIndex = folders.findIndex((f) => f.id === folder.id);
    if (folderIndex >= 0) {
      folders[folderIndex].name = name.trim();
      folders[folderIndex].color = color;
      folders[folderIndex].icon = folderIcon;
      await saveBookmarks(folders);
      await showToast({ style: Toast.Style.Success, title: `Updated "${name}" folder` });
      onFolderUpdated();
      pop();
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
    const folders = await loadBookmarks();
    const filtered = folders.filter((f) => f.id !== folder.id);
    await saveBookmarks(filtered);
    await showToast({ style: Toast.Style.Success, title: `Deleted "${folder.name}" folder` });
    if (onFolderDeleted) onFolderDeleted();
    pop();
  }

  return (
    <Form
      navigationTitle="Edit Bookmark Folder"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
          {folder.id !== "favorites" && (
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
        {FOLDER_COLORS.map((c) => (
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
  const currentColorName = COLOR_OPTIONS.find((c) => c.value === selectedColor)?.name || "Auto";

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
            <Action
              title="Download PNG"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              onAction={() => downloadPng(coloredSvg, icon.name)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action
              title="Copy SVG"
              icon={Icon.Clipboard}
              onAction={async () => {
                await Clipboard.copy(coloredSvg);
                await showHUD(`Copied ${icon.name} as SVG`);
              }}
            />
            <Action
              title="Copy PNG"
              icon={Icon.Image}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={() => copyPng(coloredSvg)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy as Component">
            <Action
              title="React (JSX)"
              icon={Icon.Code}
              onAction={async () => {
                await Clipboard.copy(svgToJsx(icon.svg, icon.name, selectedColor));
                await showHUD(`Copied ${icon.name} as React JSX`);
              }}
            />
            <Action
              title="Vue (SFC)"
              icon={Icon.Code}
              onAction={async () => {
                await Clipboard.copy(svgToVue(icon.svg, icon.name, selectedColor));
                await showHUD(`Copied ${icon.name} as Vue SFC`);
              }}
            />
            <Action
              title="Svelte"
              icon={Icon.Code}
              onAction={async () => {
                await Clipboard.copy(svgToSvelte(icon.svg, icon.name, selectedColor));
                await showHUD(`Copied ${icon.name} as Svelte`);
              }}
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
  const [selectedFolderId, setSelectedFolderId] = useState("favorites");
  const [selectedColor, setSelectedColor] = useState(defaultColor || "auto");
  const [columns, setColumns] = useState(parseInt(gridSize) || 5);

  const loadData = useCallback(async () => {
    const [loadedFolders, storedColor, storedGridSize, lastFolder] = await Promise.all([
      loadBookmarks(),
      LocalStorage.getItem<string>(COLOR_KEY),
      LocalStorage.getItem<string>(GRID_SIZE_KEY),
      LocalStorage.getItem<string>(LAST_FOLDER_KEY),
    ]);
    setFolders(loadedFolders);
    setSelectedColor(storedColor || defaultColor || "auto");
    setColumns(parseInt(storedGridSize || gridSize) || 5);
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
    const colorName = COLOR_OPTIONS.find((c) => c.value === color)?.name || color;
    await showToast({ style: Toast.Style.Success, title: `Color: ${colorName}` });
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
      if (folderId === "favorites") {
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
      const updatedFolders = folders.filter((f) => f.id !== folderId);
      await saveBookmarks(updatedFolders);
      setFolders(updatedFolders);
      if (selectedFolderId === folderId) {
        setSelectedFolderId("favorites");
        await LocalStorage.setItem(LAST_FOLDER_KEY, "favorites");
      }
      await showToast({ style: Toast.Style.Success, title: "Folder deleted" });
    },
    [folders, selectedFolderId],
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

  const currentColorName = COLOR_OPTIONS.find((c) => c.value === selectedColor)?.name || "Auto";

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
                onAction={async () => {
                  await Clipboard.copy(coloredSvg);
                  await showHUD(`Copied ${icon.name} as SVG`);
                }}
              />
              <Action.Paste title="Paste SVG" content={coloredSvg} />
            </ActionPanel.Section>
            <ActionPanel.Section title="Copy as Component">
              <Action
                title="React (JSX)"
                icon={Icon.Code}
                onAction={async () => {
                  await Clipboard.copy(svgToJsx(icon.svg, icon.name, selectedColor));
                  await showHUD(`Copied ${icon.name} as React JSX`);
                }}
              />
              <Action
                title="Vue (SFC)"
                icon={Icon.Code}
                onAction={async () => {
                  await Clipboard.copy(svgToVue(icon.svg, icon.name, selectedColor));
                  await showHUD(`Copied ${icon.name} as Vue SFC`);
                }}
              />
              <Action
                title="Svelte"
                icon={Icon.Code}
                onAction={async () => {
                  await Clipboard.copy(svgToSvelte(icon.svg, icon.name, selectedColor));
                  await showHUD(`Copied ${icon.name} as Svelte`);
                }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title="Download">
              <Action
                title="Download SVG"
                icon={Icon.Download}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                onAction={() => downloadSvg(coloredSvg, icon.name)}
              />
              <Action
                title="Copy PNG"
                icon={Icon.Image}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                onAction={() => copyPng(coloredSvg)}
              />
              <Action
                title="Download PNG"
                icon={Icon.Download}
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                onAction={() => downloadPng(coloredSvg, icon.name)}
              />
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
                      source: folder.icon ? FOLDER_ICONS[folder.icon] || Icon.Folder : Icon.Folder,
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
                target={<CreateFolderForm onFolderCreated={loadData} />}
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
              {selectedFolderId !== "favorites" && (
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
                  source: folder.icon ? FOLDER_ICONS[folder.icon] || Icon.Folder : Icon.Folder,
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
            source: selectedFolder?.icon ? FOLDER_ICONS[selectedFolder.icon] || Icon.Folder : Icon.Folder,
            tintColor: getFolderColor(selectedFolder?.color || "Yellow"),
          }}
          title={`No icons in ${selectedFolder?.name}`}
          description="Add icons to this folder from the Search Icons command"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create New Folder"
                icon={Icon.Plus}
                target={<CreateFolderForm onFolderCreated={loadData} />}
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
              {selectedFolderId !== "favorites" && (
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
