import { Action, ActionPanel, Form, Icon, Toast, popToRoot, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { createBookmarkFolder } from "../lib/bookmarks";
import { FOLDER_COLOR_OPTIONS, FOLDER_ICON_OPTIONS } from "../lib/constants";
import type { HugeIcon } from "../lib/types";

interface CreateBookmarkFolderFormProps {
  initialIcon?: HugeIcon;
  initialIcons?: HugeIcon[];
  onFolderCreated?: () => void | Promise<void>;
  closeBehavior?: "pop" | "popToRoot" | "none";
}

export function CreateBookmarkFolderForm({
  initialIcon,
  initialIcons,
  onFolderCreated,
  closeBehavior = "pop",
}: CreateBookmarkFolderFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [color, setColor] = useState("Blue");
  const [folderIcon, setFolderIcon] = useState("Folder");

  async function closeForm() {
    if (closeBehavior === "popToRoot") {
      await popToRoot();
      return;
    }

    if (closeBehavior === "pop") {
      pop();
    }
  }

  async function handleSubmit() {
    try {
      const iconsToAdd = initialIcons ?? (initialIcon ? [initialIcon] : []);
      const folder = await createBookmarkFolder({
        name,
        color,
        icon: folderIcon,
        initialIcons: iconsToAdd,
      });
      const title =
        iconsToAdd.length === 0
          ? `Created "${folder.name}" folder`
          : iconsToAdd.length === 1
            ? `Created "${folder.name}" and added "${iconsToAdd[0].name}"`
            : `Created "${folder.name}" and added ${iconsToAdd.length} icons`;

      await showToast({ style: Toast.Style.Success, title });
      await onFolderCreated?.();
      await closeForm();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't create folder",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
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
        {FOLDER_ICON_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.name} icon={option.icon} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="color" title="Folder Color" value={color} onChange={setColor}>
        {FOLDER_COLOR_OPTIONS.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value}
            title={option.name}
            icon={{ source: Icon.Circle, tintColor: option.raycastColor }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
