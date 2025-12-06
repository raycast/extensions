import { useState } from "react";
import { ActionPanel, Action, Form, showToast, Toast, LocalStorage, Icon, Color, popToRoot } from "@raycast/api";

interface BookmarkFolder {
  id: string;
  name: string;
  color: string;
  icon: string;
  icons: { name: string; svg: string }[];
}

const BOOKMARKS_KEY = "hugeicons-bookmarks";

const FOLDER_COLORS = [
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

const DEFAULT_FOLDER: BookmarkFolder = {
  id: "favorites",
  name: "Favorites",
  color: "Yellow",
  icon: "Star",
  icons: [],
};

async function loadBookmarks(): Promise<BookmarkFolder[]> {
  const stored = await LocalStorage.getItem<string>(BOOKMARKS_KEY);
  if (!stored) return [DEFAULT_FOLDER];
  try {
    const folders = JSON.parse(stored) as BookmarkFolder[];
    if (!folders.find((f) => f.id === "favorites")) {
      folders.unshift(DEFAULT_FOLDER);
    }
    return folders;
  } catch {
    return [DEFAULT_FOLDER];
  }
}

async function saveBookmarks(folders: BookmarkFolder[]): Promise<void> {
  await LocalStorage.setItem(BOOKMARKS_KEY, JSON.stringify(folders));
}

export default function Command() {
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
    await popToRoot();
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
