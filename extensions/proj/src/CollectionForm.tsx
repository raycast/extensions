import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState, useMemo } from "react";
import { createCollection, updateCollection } from "./collections";
import { ICON_COLORS } from "./utils";
import type { Collection } from "./types";

interface CollectionFormProps {
  collection?: Collection;
  onSave: () => void;
}

function getAvailableIcons(): { value: string; title: string; icon?: Icon }[] {
  const icons: { value: string; title: string; icon?: Icon }[] = [
    { value: "", title: "None" },
  ];

  for (const key of Object.keys(Icon)) {
    if (!isNaN(Number(key))) continue;
    const iconValue = Icon[key as keyof typeof Icon];
    if (typeof iconValue === "string" || typeof iconValue === "symbol") {
      icons.push({
        value: key,
        title: key.replace(/([A-Z])/g, " $1").trim(),
        icon: iconValue as Icon,
      });
    }
  }

  // Sort but keep "None" at the top
  const [none, ...rest] = icons;
  return [none, ...rest.slice().sort((a, b) => a.title.localeCompare(b.title))];
}

export default function CollectionForm({
  collection,
  onSave,
}: CollectionFormProps) {
  const { pop } = useNavigation();
  const isEditing = !!collection;

  const [name, setName] = useState(collection?.name || "");
  const [icon, setIcon] = useState(collection?.icon || "");
  const [color, setColor] = useState(collection?.color || ICON_COLORS[0].value);

  const availableIcons = useMemo(() => getAvailableIcons(), []);

  async function handleSubmit() {
    if (!name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }

    if (isEditing && collection) {
      updateCollection(collection.id, {
        name: name.trim(),
        icon: icon || undefined,
        color,
      });
    } else {
      createCollection({
        name: name.trim(),
        type: "manual",
        icon: icon || undefined,
        color,
      });
    }

    await showToast({
      style: Toast.Style.Success,
      title: isEditing ? "Collection updated" : "Collection created",
    });

    onSave();
    pop();
  }

  return (
    <Form
      navigationTitle={
        isEditing ? `Edit: ${collection.name}` : "New Collection"
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Save Changes" : "Create Collection"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Collections let you organize projects into groups. Assign projects to collections for quick filtering with #collection in search." />

      <Form.TextField
        id="name"
        title="Name"
        placeholder="e.g., Work, Personal, Archived"
        value={name}
        onChange={setName}
      />

      <Form.Dropdown id="icon" title="Icon" value={icon} onChange={setIcon}>
        {availableIcons.map((item) => (
          <Form.Dropdown.Item
            key={item.value}
            value={item.value}
            title={item.title}
            icon={item.icon}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="color" title="Color" value={color} onChange={setColor}>
        {ICON_COLORS.map((c) => (
          <Form.Dropdown.Item
            key={c.value}
            value={c.value}
            title={c.name}
            icon={{ source: Icon.Circle, tintColor: c.value }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
