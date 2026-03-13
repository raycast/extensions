import { Action, ActionPanel, Alert, Icon, List, LocalStorage, confirmAlert } from "@raycast/api";
import { useEffect, useState } from "react";
import { TAG_DEFINITIONS_KEY } from "../constants";
import { TagDefinitions } from "../types";
import { CreateTagForm } from "./create-tag-form";
import { EditTagForm } from "./edit-tag-form";

export function TagsManager({
  onCreate,
  onEdit,
  onDelete,
  onWillDisappear,
}: {
  onCreate: (name: string, color: string) => void;
  onEdit: (id: string, newName: string, newColor: string) => void;
  onDelete: (id: string) => void;
  onWillDisappear?: () => void;
}) {
  const [tagDefinitions, setTagDefinitions] = useState<TagDefinitions>({});

  useEffect(() => {
    return () => {
      onWillDisappear?.();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const defsStr = await LocalStorage.getItem<string>(TAG_DEFINITIONS_KEY);
      if (!defsStr || cancelled) return;
      try {
        setTagDefinitions(JSON.parse(defsStr));
      } catch {
        /* ignore */
      }
    }
    load();
    const interval = setInterval(load, 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function handleDelete(id: string, name: string) {
    const confirmed = await confirmAlert({
      title: "Delete Tag",
      message: `Are you sure you want to delete the tag "${name}"?`,
      icon: Icon.Trash,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (confirmed) {
      onDelete(id);
    }
  }

  return (
    <List navigationTitle="Manage Tags">
      {Object.values(tagDefinitions).map((def) => (
        <List.Item
          key={def.id}
          title={def.name}
          icon={{ source: Icon.Tag, tintColor: def.color }}
          actions={
            <ActionPanel>
              <Action.Push title="Edit Tag" icon={Icon.Pencil} target={<EditTagForm tagDef={def} onEdit={onEdit} />} />
              <Action
                title="Delete Tag"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(def.id, def.name)}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.Item
        key="create"
        title="Create New Tag"
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <Action.Push title="Create" icon={Icon.Plus} target={<CreateTagForm onCreate={onCreate} />} />
          </ActionPanel>
        }
      />
    </List>
  );
}
