import {
  ActionPanel,
  Action,
  List,
  Form,
  Icon,
  LocalStorage,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  openExtensionPreferences,
  Color,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";

const COLOR_KEY = "hugeicons-color";
const GRID_SIZE_KEY = "hugeicons-grid-size";
const BOOKMARKS_KEY = "hugeicons-bookmarks";

interface ColorOption {
  name: string;
  value: string;
  color?: Color;
}

interface GridSizeOption {
  name: string;
  value: string;
}

interface BookmarkFolder {
  id: string;
  name: string;
  color: string;
  icon?: string;
  icons: { name: string; svg: string }[];
}

const FOLDER_ICONS: Record<string, Icon> = {
  Folder: Icon.Folder,
  Star: Icon.Star,
  Heart: Icon.Heart,
  Bookmark: Icon.Bookmark,
  Tag: Icon.Tag,
  Box: Icon.Box,
  Document: Icon.Document,
  Code: Icon.Code,
  Globe: Icon.Globe,
  Person: Icon.Person,
  Building: Icon.Building,
  Cart: Icon.Cart,
  GameController: Icon.GameController,
  Music: Icon.Music,
  Video: Icon.Video,
  Camera: Icon.Camera,
  Brush: Icon.Brush,
  Hammer: Icon.Hammer,
  Gear: Icon.Gear,
  LightBulb: Icon.LightBulb,
};

const COLOR_OPTIONS: ColorOption[] = [
  { name: "Auto (adapts to theme)", value: "auto", color: Color.PrimaryText },
  { name: "White", value: "#FFFFFF", color: Color.PrimaryText },
  { name: "Black", value: "#000000", color: Color.SecondaryText },
  { name: "Red", value: "#FF3B30", color: Color.Red },
  { name: "Orange", value: "#FF9500", color: Color.Orange },
  { name: "Yellow", value: "#FFCC00", color: Color.Yellow },
  { name: "Green", value: "#34C759", color: Color.Green },
  { name: "Blue", value: "#007AFF", color: Color.Blue },
  { name: "Purple", value: "#AF52DE", color: Color.Purple },
  { name: "Magenta", value: "#FF2D55", color: Color.Magenta },
];

const GRID_SIZE_OPTIONS: GridSizeOption[] = [
  { name: "Large (3 columns)", value: "3" },
  { name: "Medium (5 columns)", value: "5" },
  { name: "Small (8 columns)", value: "8" },
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

const FOLDER_COLOR_OPTIONS = [
  { name: "Red", value: "Red", color: Color.Red },
  { name: "Orange", value: "Orange", color: Color.Orange },
  { name: "Yellow", value: "Yellow", color: Color.Yellow },
  { name: "Green", value: "Green", color: Color.Green },
  { name: "Blue", value: "Blue", color: Color.Blue },
  { name: "Purple", value: "Purple", color: Color.Purple },
  { name: "Magenta", value: "Magenta", color: Color.Magenta },
];

const FOLDER_COLORS: Record<string, Color> = {
  Red: Color.Red,
  Orange: Color.Orange,
  Yellow: Color.Yellow,
  Green: Color.Green,
  Blue: Color.Blue,
  Purple: Color.Purple,
  Magenta: Color.Magenta,
};

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

    const stored = await LocalStorage.getItem<string>(BOOKMARKS_KEY);
    const folders: BookmarkFolder[] = stored ? JSON.parse(stored) : [];
    const id = `folder-${Date.now()}`;
    folders.push({ id, name: name.trim(), color, icon: folderIcon, icons: [] });
    await LocalStorage.setItem(BOOKMARKS_KEY, JSON.stringify(folders));
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

export default function Command() {
  const [selectedColor, setSelectedColor] = useState<string>("auto");
  const [selectedGridSize, setSelectedGridSize] = useState<string>("5");
  const [bookmarkFolders, setBookmarkFolders] = useState<BookmarkFolder[]>([]);

  const loadData = useCallback(async () => {
    const [storedColor, storedGridSize, storedBookmarks] = await Promise.all([
      LocalStorage.getItem<string>(COLOR_KEY),
      LocalStorage.getItem<string>(GRID_SIZE_KEY),
      LocalStorage.getItem<string>(BOOKMARKS_KEY),
    ]);
    if (storedColor) {
      setSelectedColor(storedColor);
    }
    if (storedGridSize) {
      setSelectedGridSize(storedGridSize);
    }
    if (storedBookmarks) {
      try {
        const folders = JSON.parse(storedBookmarks) as BookmarkFolder[];
        setBookmarkFolders(folders);
      } catch {
        setBookmarkFolders([]);
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function changeColor(color: string) {
    setSelectedColor(color);
    await LocalStorage.setItem(COLOR_KEY, color);
    const colorName = COLOR_OPTIONS.find((c) => c.value === color)?.name || color;
    await showToast({ style: Toast.Style.Success, title: `Default color: ${colorName}` });
  }

  async function changeGridSize(size: string) {
    setSelectedGridSize(size);
    await LocalStorage.setItem(GRID_SIZE_KEY, size);
    const sizeName = GRID_SIZE_OPTIONS.find((s) => s.value === size)?.name || size;
    await showToast({ style: Toast.Style.Success, title: `Grid size: ${sizeName}` });
  }

  async function deleteFolder(folderId: string) {
    if (folderId === "favorites") {
      await showToast({ style: Toast.Style.Failure, title: "Cannot delete Favorites folder" });
      return;
    }

    const folder = bookmarkFolders.find((f) => f.id === folderId);
    const confirmed = await confirmAlert({
      title: `Delete "${folder?.name}" Folder`,
      message: `Are you sure you want to delete this folder and its ${folder?.icons.length || 0} icons?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      const updatedFolders = bookmarkFolders.filter((f) => f.id !== folderId);
      await LocalStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updatedFolders));
      await loadData();
      await showToast({ style: Toast.Style.Success, title: "Folder deleted" });
    }
  }

  const currentColorName = COLOR_OPTIONS.find((c) => c.value === selectedColor)?.name || "Auto";
  const currentGridSizeName = GRID_SIZE_OPTIONS.find((s) => s.value === selectedGridSize)?.name || "Medium";

  return (
    <List navigationTitle="Hugeicons Preferences">
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
          icon={{ source: Icon.CircleFilled, tintColor: COLOR_OPTIONS.find((c) => c.value === selectedColor)?.color }}
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
                      tintColor: color.color,
                    }}
                    onAction={() => changeColor(color.value)}
                  />
                ))}
              </ActionPanel.Section>
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
                target={<CreateFolderForm onFolderCreated={loadData} />}
              />
            </ActionPanel>
          }
        />
        {bookmarkFolders.map((folder) => (
          <List.Item
            key={folder.id}
            icon={{
              source: folder.icon ? FOLDER_ICONS[folder.icon] || Icon.Folder : Icon.Folder,
              tintColor: FOLDER_COLORS[folder.color] || Color.Yellow,
            }}
            title={folder.name}
            subtitle={`${folder.icons.length} icon${folder.icons.length !== 1 ? "s" : ""}`}
            actions={
              <ActionPanel>
                {folder.id !== "favorites" && (
                  <Action
                    title="Delete Folder"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => deleteFolder(folder.id)}
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
