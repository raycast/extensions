import {
  Action,
  ActionPanel,
  Application,
  Form,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { TAG_DEFINITIONS_KEY, TAG_ORDER_KEY } from "../constants";
import { TagEvents } from "../helpers";
import { TagDefinitions } from "../types";
import { TagsManager } from "./tags-manager";

export function TagEditor({
  app,
  onSave,
  onCreateGlobal,
  onEditGlobal,
  onDeleteGlobal,
  tagOrder,
}: {
  app: Application;
  onSave: (tags: string[]) => void;
  onCreateGlobal: (name: string, color: string) => void;
  onEditGlobal: (id: string, newName: string, newColor: string) => void;
  onDeleteGlobal: (id: string) => void;
  tagOrder: string[];
}) {
  const { pop } = useNavigation();
  const [tagDefinitions, setTagDefinitions] = useState<TagDefinitions>({});
  const [availableTagIds, setAvailableTagIds] = useState<string[]>(tagOrder);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [formVersion, setFormVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadFromStorage = useCallback(async () => {
    const stored = await LocalStorage.allItems();
    let defs: TagDefinitions = {};
    if (stored[TAG_DEFINITIONS_KEY]) {
      try {
        defs = JSON.parse(stored[TAG_DEFINITIONS_KEY] as string);
      } catch {
        defs = {};
      }
    }

    let order: string[] = tagOrder;
    if (stored[TAG_ORDER_KEY]) {
      try {
        order = JSON.parse(stored[TAG_ORDER_KEY] as string);
      } catch {
        order = tagOrder;
      }
    }

    setTagDefinitions(defs);
    setAvailableTagIds(order);

    const raw = stored[app.bundleId ?? app.path];
    if (raw) {
      try {
        const parsed = JSON.parse(raw as string);
        if (Array.isArray(parsed)) setSelectedTagIds(parsed);
      } catch {
        /* ignore */
      }
    }

    setIsLoading(false);
  }, [app.bundleId, app.path, tagOrder]);

  // ✅ Initial load + listener for external changes
  useEffect(() => {
    loadFromStorage();

    const handler = async () => {
      await loadFromStorage();
      setFormVersion((v) => v + 1);
    };

    TagEvents.on("tagsUpdated", handler);

    // ✅ Proper cleanup — return a function that *calls* off(), not returns it
    return () => {
      TagEvents.off("tagsUpdated", handler);
    };
  }, [loadFromStorage]);

  useEffect(() => {
    const onBackReload = async () => {
      console.log("♻️ Reloading tags after returning from ManageTags");
      await loadFromStorage();
      setFormVersion((v) => v + 1);
    };

    TagEvents.on("tagsReload", onBackReload);

    // ✅ Return a function that calls .off() but doesn't return anything
    return () => {
      TagEvents.off("tagsReload", onBackReload);
    };
  }, [loadFromStorage]);

  async function handleSubmit(values: Record<string, string[]>) {
    const tags = values["tags"] ?? [];
    await onSave(tags);
    await showToast({ style: Toast.Style.Success, title: "Tags saved" });
    pop();
  }

  // ✅ Don’t pop here; reload only happens when you go back
  async function createLocal(name: string, color: string) {
    await onCreateGlobal(name, color);
    await new Promise((r) => setTimeout(r, 150));
    TagEvents.emit("tagsReload");
  }

  async function editLocal(id: string, newName: string, newColor: string) {
    await onEditGlobal(id, newName, newColor);
    await new Promise((r) => setTimeout(r, 150));
    TagEvents.emit("tagsReload");
  }

  async function deleteLocal(id: string) {
    await onDeleteGlobal(id);
    await new Promise((r) => setTimeout(r, 150));
    TagEvents.emit("tagsReload");
  }

  if (isLoading) return <List isLoading navigationTitle={`Tags for ${app.name}`} />;

  const tagItems = availableTagIds
    .map((tagId) => {
      const def = tagDefinitions[tagId];
      if (!def) return null;
      return {
        id: tagId,
        key: `${tagId}-${def.name}-${def.color}-${formVersion}`,
        name: def.name,
        color: def.color,
      };
    })
    .filter((item): item is { id: string; key: string; name: string; color: string } => item !== null);

  return (
    <Form
      key={`form-${formVersion}`}
      navigationTitle={`Tags for ${app.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
          <Action.Push
            title="Manage Tags"
            icon={Icon.Gear}
            target={
              <TagsManager
                onCreate={createLocal}
                onEdit={editLocal}
                onDelete={deleteLocal}
                onWillDisappear={() => TagEvents.emit("tagsReload")}
              />
            }
          />
        </ActionPanel>
      }
    >
      <Form.TagPicker id="tags" title="Tags" value={selectedTagIds} onChange={setSelectedTagIds}>
        {tagItems.map((item) => (
          <Form.TagPicker.Item
            key={item.key}
            value={item.id}
            title={item.name}
            icon={{ source: Icon.Tag, tintColor: item.color }}
          />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
