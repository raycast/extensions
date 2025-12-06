import { useState, useEffect, useCallback, useRef } from "react";
import {
  ActionPanel,
  Action,
  Grid,
  Detail,
  Form,
  showToast,
  Toast,
  getPreferenceValues,
  environment,
  LocalStorage,
  Icon,
  Color,
  Clipboard,
  showHUD,
  useNavigation,
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

interface IconMeta {
  name: string;
  tags: string;
  category: string;
}

interface HugeIcon {
  name: string;
  svg: string;
}

interface IconStyle {
  name: string;
  label: string;
  svg: string | null;
}

interface ApiMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface ApiResponse {
  success: boolean;
  data: IconMeta[];
  meta: ApiMeta;
}

interface ColorOption {
  name: string;
  value: string;
  raycastColor?: Color;
}

interface BookmarkFolder {
  id: string;
  name: string;
  color: string;
  icon?: string;
  icons: HugeIcon[];
}

const FOLDER_COLORS: Record<string, Color> = {
  Red: Color.Red,
  Orange: Color.Orange,
  Yellow: Color.Yellow,
  Green: Color.Green,
  Blue: Color.Blue,
  Purple: Color.Purple,
  Magenta: Color.Magenta,
};

const FOLDER_COLOR_OPTIONS = [
  { name: "Red", value: "Red", color: Color.Red },
  { name: "Orange", value: "Orange", color: Color.Orange },
  { name: "Yellow", value: "Yellow", color: Color.Yellow },
  { name: "Green", value: "Green", color: Color.Green },
  { name: "Blue", value: "Blue", color: Color.Blue },
  { name: "Purple", value: "Purple", color: Color.Purple },
  { name: "Magenta", value: "Magenta", color: Color.Magenta },
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

const COLOR_KEY = "hugeicons-color";
const GRID_SIZE_KEY = "hugeicons-grid-size";
const BOOKMARKS_KEY = "hugeicons-bookmarks";
const ICON_STYLES = ["stroke", "solid", "duotone", "twotone", "bulk"] as const;
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
  const resizedSvg = svg
    .replace(/width="24"/, `width="${size}"`)
    .replace(/height="24"/, `height="${size}"`)
    .replace(/viewBox="0 0 24 24"/, `viewBox="0 0 24 24"`);

  const tempSvgPath = join(environment.supportPath, "temp-icon.svg");
  await writeFile(tempSvgPath, resizedSvg, "utf-8");

  try {
    try {
      await execAsync("which qlmanage");
    } catch {
      throw new Error("qlmanage not found. PNG export requires macOS Quick Look.");
    }
    await execAsync(`qlmanage -t -s ${size} -o "${environment.supportPath}" "${tempSvgPath}"`);
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
  const filePath = join(DOWNLOADS_PATH, `${name}.png`);
  await svgToPng(svg, filePath, size);
  await showHUD(`Saved to Downloads/${name}.png`);
}

async function copyPng(svg: string, size: number = 256): Promise<void> {
  const tempPath = join(environment.supportPath, "clipboard-icon.png");
  await svgToPng(svg, tempPath, size);
  await Clipboard.copy({ file: tempPath });
  await showHUD("PNG copied to clipboard");
}

async function fetchSvg(name: string, apiKey: string, signal: AbortSignal, style?: string): Promise<string> {
  const url = style
    ? `https://api.hugeicons.com/v1/icon/${name}/svg?style=${style}`
    : `https://api.hugeicons.com/v1/icon/${name}/svg`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch SVG for ${name}`);
  }
  return await response.text();
}

function CreateFolderForm({ onFolderCreated, initialIcon }: { onFolderCreated: () => void; initialIcon?: HugeIcon }) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [color, setColor] = useState("Blue");
  const [folderIcon, setFolderIcon] = useState("Folder");

  async function handleSubmit() {
    if (!name.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Please enter a folder name" });
      return;
    }

    const folders = await loadBookmarkFolders();
    const id = `folder-${Date.now()}`;
    const newFolder: BookmarkFolder = {
      id,
      name: name.trim(),
      color,
      icon: folderIcon,
      icons: initialIcon ? [initialIcon] : [],
    };
    folders.push(newFolder);
    await saveBookmarkFolders(folders);
    const message = initialIcon
      ? `Created "${name}" folder and added "${initialIcon.name}"`
      : `Created "${name}" folder`;
    await showToast({ style: Toast.Style.Success, title: message });
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
        {FOLDER_COLOR_OPTIONS.map((c) => (
          <Form.Dropdown.Item
            key={c.value}
            value={c.value}
            title={c.name}
            icon={{ source: Icon.Circle, tintColor: c.color }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function IconActions({
  icon,
  selectedColor,
  onColorChange,
  bookmarkFolders,
  onAddToFolder,
  onRemoveFromFolder,
  isInFolder,
  onRefreshFolders,
  styleSuffix,
}: {
  icon: HugeIcon;
  selectedColor: string;
  onColorChange: (color: string) => void;
  bookmarkFolders: BookmarkFolder[];
  onAddToFolder: (icon: HugeIcon, folderId: string) => void;
  onRemoveFromFolder: (iconName: string, folderId: string) => void;
  isInFolder: (iconName: string, folderId: string) => boolean;
  onRefreshFolders: () => void;
  styleSuffix?: string;
}) {
  const coloredSvg = colorSvg(icon.svg, selectedColor);
  const fileName = styleSuffix ? `${icon.name}-${styleSuffix}` : icon.name;

  const copyWithNotification = async (content: string, format: string) => {
    await Clipboard.copy(content);
    await showHUD(`Copied ${fileName} as ${format}`);
  };

  return (
    <>
      <ActionPanel.Section>
        <Action title="Copy SVG" icon={Icon.Clipboard} onAction={() => copyWithNotification(coloredSvg, "SVG")} />
        <Action.Paste title="Paste SVG" content={coloredSvg} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy as Component">
        <Action
          title="React (JSX)"
          icon={Icon.Code}
          onAction={() => copyWithNotification(svgToJsx(icon.svg, fileName, selectedColor), "React JSX")}
        />
        <Action
          title="Vue (SFC)"
          icon={Icon.Code}
          onAction={() => copyWithNotification(svgToVue(icon.svg, fileName, selectedColor), "Vue SFC")}
        />
        <Action
          title="Svelte"
          icon={Icon.Code}
          onAction={() => copyWithNotification(svgToSvelte(icon.svg, fileName, selectedColor), "Svelte")}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Download">
        <Action
          title="Download SVG"
          icon={Icon.Download}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          onAction={() => downloadSvg(coloredSvg, fileName)}
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
          onAction={() => downloadPng(coloredSvg, fileName)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section
        title={bookmarkFolders.some((f) => isInFolder(icon.name, f.id)) ? "Move to..." : "Add to..."}
      >
        {bookmarkFolders.map((folder) => {
          const inFolder = isInFolder(icon.name, folder.id);
          const folderIconSource = folder.icon ? FOLDER_ICONS[folder.icon] || Icon.Folder : Icon.Folder;
          return (
            <Action
              key={folder.id}
              title={inFolder ? `Remove from ${folder.name}` : folder.name}
              icon={{
                source: inFolder ? Icon.MinusCircle : folderIconSource,
                tintColor: FOLDER_COLORS[folder.color],
              }}
              onAction={() => (inFolder ? onRemoveFromFolder(icon.name, folder.id) : onAddToFolder(icon, folder.id))}
            />
          );
        })}
        <Action.Push
          title="Create New Folder"
          icon={Icon.PlusCircle}
          target={<CreateFolderForm onFolderCreated={onRefreshFolders} initialIcon={icon} />}
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
    </>
  );
}

function StylePreviewView({
  iconName,
  styleName,
  svg,
  selectedColor,
  onColorChange,
}: {
  iconName: string;
  styleName: string;
  svg: string;
  selectedColor: string;
  onColorChange: (color: string) => void;
}) {
  const coloredSvg = colorSvg(svg, selectedColor);
  const fileName = `${iconName}-${styleName}`;
  const currentColorName = COLOR_OPTIONS.find((c) => c.value === selectedColor)?.name || "Auto";

  const markdown = `
# ${iconName}
## Style: ${styleName.charAt(0).toUpperCase() + styleName.slice(1)}

![${iconName}](${svgToDataUri(svg, selectedColor)}?raycast-width=200&raycast-height=200)

**Color:** ${currentColorName}
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${iconName} - ${styleName}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Download">
            <Action
              title="Download SVG"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={() => downloadSvg(coloredSvg, fileName)}
            />
            <Action
              title="Download PNG"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              onAction={() => downloadPng(coloredSvg, fileName)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy SVG" content={coloredSvg} />
            <Action
              title="Copy PNG"
              icon={Icon.Image}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={() => copyPng(coloredSvg)}
            />
            <Action.CopyToClipboard title="Copy JSX" content={svgToJsx(svg, fileName, selectedColor)} />
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

function IconDetailView({
  iconName,
  apiKey,
  selectedColor,
  onColorChange,
  bookmarkFolders,
  onAddToFolder,
  onRemoveFromFolder,
  isInFolder,
  onRefreshFolders,
}: {
  iconName: string;
  apiKey: string;
  selectedColor: string;
  onColorChange: (color: string) => void;
  bookmarkFolders: BookmarkFolder[];
  onAddToFolder: (icon: HugeIcon, folderId: string) => void;
  onRemoveFromFolder: (iconName: string, folderId: string) => void;
  isInFolder: (iconName: string, folderId: string) => boolean;
  onRefreshFolders: () => void;
}) {
  const [styles, setStyles] = useState<IconStyle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();

    async function loadStyles() {
      setIsLoading(true);
      const results = await Promise.all(
        ICON_STYLES.map(async (style) => {
          try {
            const svg = await fetchSvg(iconName, apiKey, abortController.signal, style);
            return { name: style, label: style.charAt(0).toUpperCase() + style.slice(1), svg };
          } catch {
            return { name: style, label: style.charAt(0).toUpperCase() + style.slice(1), svg: null };
          }
        }),
      );
      setStyles(results);
      setIsLoading(false);
    }

    loadStyles();

    return () => abortController.abort();
  }, [iconName, apiKey]);

  const currentColorName = COLOR_OPTIONS.find((c) => c.value === selectedColor)?.name || "Auto";

  return (
    <Grid
      columns={5}
      inset={Grid.Inset.Large}
      isLoading={isLoading}
      navigationTitle={`${iconName} • ${currentColorName}`}
    >
      {styles
        .filter((s) => s.svg !== null)
        .map((style) => (
          <Grid.Item
            key={style.name}
            content={{
              source: svgToDataUri(style.svg!, selectedColor),
              tooltip: `${iconName} - ${style.label}`,
            }}
            title={style.label}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="View Large Preview"
                    icon={Icon.Eye}
                    target={
                      <StylePreviewView
                        iconName={iconName}
                        styleName={style.name}
                        svg={style.svg!}
                        selectedColor={selectedColor}
                        onColorChange={onColorChange}
                      />
                    }
                  />
                </ActionPanel.Section>
                <IconActions
                  icon={{ name: iconName, svg: style.svg! }}
                  selectedColor={selectedColor}
                  onColorChange={onColorChange}
                  bookmarkFolders={bookmarkFolders}
                  onAddToFolder={onAddToFolder}
                  onRemoveFromFolder={onRemoveFromFolder}
                  isInFolder={isInFolder}
                  onRefreshFolders={onRefreshFolders}
                  styleSuffix={style.name}
                />
              </ActionPanel>
            }
          />
        ))}
    </Grid>
  );
}

async function loadBookmarkFolders(): Promise<BookmarkFolder[]> {
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

async function saveBookmarkFolders(folders: BookmarkFolder[]): Promise<void> {
  await LocalStorage.setItem(BOOKMARKS_KEY, JSON.stringify(folders));
}

export default function Command() {
  const { apiKey, gridSize, defaultColor } = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchedText, setSearchedText] = useState("");
  const [icons, setIcons] = useState<HugeIcon[]>([]);
  const [bookmarkFolders, setBookmarkFolders] = useState<BookmarkFolder[]>([DEFAULT_FOLDER]);
  const [selectedColor, setSelectedColor] = useState(defaultColor || "auto");
  const [columns, setColumns] = useState(parseInt(gridSize) || 5);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIcons, setSelectedIcons] = useState<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async () => {
    const [folders, storedColor, storedGridSize] = await Promise.all([
      loadBookmarkFolders(),
      LocalStorage.getItem<string>(COLOR_KEY),
      LocalStorage.getItem<string>(GRID_SIZE_KEY),
    ]);
    setBookmarkFolders(folders);
    setSelectedColor(storedColor || defaultColor || "auto");
    setColumns(parseInt(storedGridSize || gridSize) || 5);
  }, [defaultColor, gridSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleColorChange = useCallback(async (color: string) => {
    setSelectedColor(color);
    await LocalStorage.setItem(COLOR_KEY, color);
    const colorName = COLOR_OPTIONS.find((c) => c.value === color)?.name || color;
    await showToast({ style: Toast.Style.Success, title: `Color: ${colorName}` });
  }, []);

  const addToFolder = useCallback(
    async (icon: HugeIcon, folderId: string) => {
      const folders = [...bookmarkFolders];
      const folderIndex = folders.findIndex((f) => f.id === folderId);
      if (folderIndex >= 0) {
        const folder = folders[folderIndex];
        if (!folder.icons.find((i) => i.name === icon.name)) {
          folder.icons.push(icon);
          setBookmarkFolders(folders);
          await saveBookmarkFolders(folders);
          await showToast({ style: Toast.Style.Success, title: `Added to ${folder.name}` });
        } else {
          await showToast({ style: Toast.Style.Failure, title: `Already in ${folder.name}` });
        }
      }
    },
    [bookmarkFolders],
  );

  const removeFromFolder = useCallback(
    async (iconName: string, folderId: string) => {
      const folders = [...bookmarkFolders];
      const folderIndex = folders.findIndex((f) => f.id === folderId);
      if (folderIndex >= 0) {
        folders[folderIndex].icons = folders[folderIndex].icons.filter((i) => i.name !== iconName);
        setBookmarkFolders(folders);
        await saveBookmarkFolders(folders);
        await showToast({ style: Toast.Style.Success, title: "Removed from folder" });
      }
    },
    [bookmarkFolders],
  );

  const isInFolder = useCallback(
    (iconName: string, folderId: string) => {
      const folder = bookmarkFolders.find((f) => f.id === folderId);
      return folder?.icons.some((i) => i.name === iconName) || false;
    },
    [bookmarkFolders],
  );

  const getIconFolder = useCallback(
    (iconName: string): BookmarkFolder | undefined => {
      return bookmarkFolders.find((folder) => folder.icons.some((i) => i.name === iconName));
    },
    [bookmarkFolders],
  );

  const toggleIconSelection = useCallback((iconName: string) => {
    setSelectedIcons((prev) => {
      const next = new Set(prev);
      if (next.has(iconName)) {
        next.delete(iconName);
      } else {
        next.add(iconName);
      }
      return next;
    });
  }, []);

  const selectAllIcons = useCallback(() => {
    const allIconNames = icons.map((i) => i.name);
    setSelectedIcons(new Set(allIconNames));
  }, [icons]);

  const deselectAllIcons = useCallback(() => {
    setSelectedIcons(new Set());
  }, []);

  const addSelectedToFolder = useCallback(
    async (folderId: string) => {
      const folders = [...bookmarkFolders];
      const folderIndex = folders.findIndex((f) => f.id === folderId);
      if (folderIndex >= 0) {
        const folder = folders[folderIndex];
        const iconsToAdd = icons.filter(
          (i) => selectedIcons.has(i.name) && !folder.icons.find((fi) => fi.name === i.name),
        );
        if (iconsToAdd.length > 0) {
          folder.icons.push(...iconsToAdd);
          setBookmarkFolders(folders);
          await saveBookmarkFolders(folders);
          await showToast({ style: Toast.Style.Success, title: `Added ${iconsToAdd.length} icons to ${folder.name}` });
          setSelectedIcons(new Set());
        } else {
          await showToast({ style: Toast.Style.Failure, title: "Icons already in folder" });
        }
      }
    },
    [bookmarkFolders, icons, selectedIcons],
  );

  const fetchIcons = useCallback(
    async (query: string, page: number = 1) => {
      if (!query.trim()) {
        setIcons([]);
        setSearchedText("");
        setCurrentPage(1);
        setTotalPages(1);
        setIsLoading(false);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          q: query,
          per_page: "100",
          page: page.toString(),
        });

        const response = await fetch(`https://api.hugeicons.com/v1/icons?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          signal,
        });

        if (response.status === 429) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Rate Limited",
            message: "Too many requests. Please wait a moment.",
          });
          setIsLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = (await response.json()) as ApiResponse;
        const iconMetas = data.data || [];

        const queryLower = query.toLowerCase();
        const filteredMetas = iconMetas.filter((meta) => meta.name.toLowerCase().includes(queryLower));

        const iconsWithSvg = await Promise.all(
          filteredMetas.map(async (meta) => {
            try {
              const svg = await fetchSvg(meta.name, apiKey, signal);
              return { name: meta.name, svg };
            } catch {
              return null;
            }
          }),
        );

        setIcons(iconsWithSvg.filter((icon): icon is HugeIcon => icon !== null));
        setSearchedText(query);
        setCurrentPage(data.meta?.page || 1);
        setTotalPages(data.meta?.total_pages || 1);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch icons",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        setIcons([]);
      } finally {
        setIsLoading(false);
      }
    },
    [apiKey],
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      fetchIcons(searchText, 1);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchText, fetchIcons]);

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages && searchText.trim()) {
        fetchIcons(searchText, page);
      }
    },
    [searchText, totalPages, fetchIcons],
  );

  const currentColorName = COLOR_OPTIONS.find((c) => c.value === selectedColor)?.name || "Auto";

  const renderIconItem = (icon: HugeIcon, showBulkActions: boolean = false) => {
    const iconFolder = getIconFolder(icon.name);
    const isSelected = selectedIcons.has(icon.name);
    const accessory = isSelected
      ? { icon: { source: Icon.CheckCircle, tintColor: Color.Green } }
      : iconFolder
        ? {
            icon: {
              source: iconFolder.icon ? FOLDER_ICONS[iconFolder.icon] || Icon.Folder : Icon.Folder,
              tintColor: FOLDER_COLORS[iconFolder.color],
            },
          }
        : undefined;
    return (
      <Grid.Item
        key={icon.name}
        content={{
          source: svgToDataUri(icon.svg, selectedColor),
          tooltip: icon.name,
        }}
        title={icon.name}
        accessory={accessory}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.Push
                title="View All Styles"
                icon={Icon.Eye}
                target={
                  <IconDetailView
                    iconName={icon.name}
                    apiKey={apiKey}
                    selectedColor={selectedColor}
                    onColorChange={handleColorChange}
                    bookmarkFolders={bookmarkFolders}
                    onAddToFolder={addToFolder}
                    onRemoveFromFolder={removeFromFolder}
                    isInFolder={isInFolder}
                    onRefreshFolders={loadData}
                  />
                }
              />
            </ActionPanel.Section>
            <IconActions
              icon={icon}
              selectedColor={selectedColor}
              onColorChange={handleColorChange}
              bookmarkFolders={bookmarkFolders}
              onAddToFolder={addToFolder}
              onRemoveFromFolder={removeFromFolder}
              isInFolder={isInFolder}
              onRefreshFolders={loadData}
            />
            {showBulkActions && (
              <ActionPanel.Section title="Bulk Select">
                <Action
                  title={isSelected ? "Deselect Icon" : "Select Icon"}
                  icon={isSelected ? Icon.Circle : Icon.CheckCircle}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() => toggleIconSelection(icon.name)}
                />
                {icons.length > 0 && (
                  <>
                    <Action
                      title="Select All"
                      icon={Icon.CheckCircle}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                      onAction={selectAllIcons}
                    />
                    {selectedIcons.size > 0 && (
                      <Action
                        title="Deselect All"
                        icon={Icon.Circle}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                        onAction={deselectAllIcons}
                      />
                    )}
                  </>
                )}
              </ActionPanel.Section>
            )}
            {showBulkActions && selectedIcons.size > 0 && (
              <ActionPanel.Section title={`Add ${selectedIcons.size} Selected to...`}>
                {bookmarkFolders.map((folder) => (
                  <Action
                    key={folder.id}
                    title={folder.name}
                    icon={{
                      source: folder.icon ? FOLDER_ICONS[folder.icon] || Icon.Folder : Icon.Folder,
                      tintColor: FOLDER_COLORS[folder.color],
                    }}
                    onAction={() => addSelectedToFolder(folder.id)}
                  />
                ))}
              </ActionPanel.Section>
            )}
            {totalPages > 1 && (
              <ActionPanel.Section title="Pages">
                {currentPage > 1 && (
                  <Action
                    title="Previous Page"
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: ["cmd"], key: "[" }}
                    onAction={() => goToPage(currentPage - 1)}
                  />
                )}
                {currentPage < totalPages && (
                  <Action
                    title="Next Page"
                    icon={Icon.ArrowRight}
                    shortcut={{ modifiers: ["cmd"], key: "]" }}
                    onAction={() => goToPage(currentPage + 1)}
                  />
                )}
              </ActionPanel.Section>
            )}
          </ActionPanel>
        }
      />
    );
  };

  const searchMatches = searchText.trim() === searchedText.trim();
  const isSearching = searchText.trim() && !searchMatches;
  const favoritesFolder = bookmarkFolders.find((f) => f.id === "favorites");
  const showFavorites = !searchText.trim() && favoritesFolder && favoritesFolder.icons.length > 0;
  const showSearchResults = searchMatches && searchedText.trim() && icons.length > 0;
  const showEmptyState = !searchText.trim() && (!favoritesFolder || favoritesFolder.icons.length === 0);
  const showNoResults = searchMatches && searchedText.trim() && icons.length === 0;

  return (
    <Grid
      columns={columns}
      inset={Grid.Inset.Large}
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Hugeicons..."
      throttle
      searchBarAccessory={
        totalPages > 1 ? (
          <Grid.Dropdown
            tooltip="Page"
            value={`page-${currentPage}`}
            onChange={(newValue) => {
              const page = parseInt(newValue.replace("page-", ""));
              if (page !== currentPage) {
                goToPage(page);
              }
            }}
          >
            <Grid.Dropdown.Section title={`Page ${currentPage} of ${totalPages}`}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Grid.Dropdown.Item key={page} title={`Page ${page}`} value={`page-${page}`} />
              ))}
            </Grid.Dropdown.Section>
          </Grid.Dropdown>
        ) : undefined
      }
    >
      {showEmptyState && (
        <Grid.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Start typing to search for icons"
          description="Tip: Bookmark an icon to see it appear here"
        />
      )}
      {isSearching && <Grid.EmptyView icon={Icon.MagnifyingGlass} title="Searching..." />}
      {showNoResults && (
        <Grid.EmptyView icon={Icon.XMarkCircle} title="No icons found" description="Try a different search term" />
      )}
      {showFavorites && favoritesFolder && (
        <Grid.Section title={`Favorites • ${currentColorName}`}>
          {favoritesFolder.icons.map((icon) => renderIconItem(icon, false))}
        </Grid.Section>
      )}
      {showSearchResults && (
        <Grid.Section
          title={`Search Results • ${currentColorName}${selectedIcons.size > 0 ? ` • ${selectedIcons.size} selected` : ""}${totalPages > 1 ? ` • Page ${currentPage}/${totalPages}` : ""}`}
        >
          {icons.map((icon) => renderIconItem(icon, true))}
        </Grid.Section>
      )}
    </Grid>
  );
}
