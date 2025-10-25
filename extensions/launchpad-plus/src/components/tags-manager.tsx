import { Action, ActionPanel, Icon, List, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { TAG_DEFINITIONS_KEY } from "../contants";
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
    // Return a cleanup function that runs when this component is unmounted (when user presses Esc/back)
    return () => {
      if (onWillDisappear) {
        onWillDisappear();
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const defsStr = await LocalStorage.getItem<string>(TAG_DEFINITIONS_KEY);
      if (!defsStr || cancelled) return;
      try {
        setTagDefinitions(JSON.parse(defsStr));
        // eslint-disable-next-line no-empty
      } catch {}
    }
    load();
    const interval = setInterval(load, 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

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
                onAction={() => onDelete(def.id)}
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
