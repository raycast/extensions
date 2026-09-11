import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useEffect, useState } from "react";
import { generateId, loadShortcuts, saveShortcuts } from "./data";
import { UNCATEGORIZED } from "./types";
import type { NewShortcut, Shortcut } from "./types";

interface FormValues {
  keys: string;
  title: string;
  category: string;
}

export function ShortcutForm({ existing, mutate }: { existing?: Shortcut; mutate: () => void }) {
  const editing = existing !== undefined;
  const { pop } = useNavigation();

  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [knownTags, setKnownTags] = useState<string[]>([]);

  useEffect(() => {
    loadShortcuts().then((items) => {
      const tagSet = new Set<string>();
      for (const s of items) {
        if (s.id !== existing?.id) {
          for (const t of s.tags ?? []) tagSet.add(t);
        }
      }
      setKnownTags([...tagSet].sort());
    });
  }, [existing?.id]);

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      keys: existing?.keys ?? "",
      category: existing?.category ?? "",
      title: existing?.title ?? "",
    },
    validation: {
      title: FormValidation.Required,
      keys: FormValidation.Required,
    },
    async onSubmit(values) {
      const cleaned = tags.map((t) => t.trim()).filter((t) => t.length > 0);

      const shortcut: NewShortcut = {
        category: values.category.trim() || UNCATEGORIZED,
        title: values.title.trim(),
        keys: values.keys.trim(),
        tags: cleaned.length > 0 ? cleaned : undefined,
      };

      const items = await loadShortcuts();
      if (existing) {
        const idx = items.findIndex((i) => i.id === existing.id);
        items[idx] = { ...existing, ...shortcut, id: existing.id, source: undefined, sourceFile: undefined };
      } else {
        items.push({ ...shortcut, id: generateId() });
      }

      await saveShortcuts(items);
      mutate();
      showToast({ style: Toast.Style.Success, title: existing ? "Shortcut updated" : "Shortcut added" });
      pop();
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={editing ? "Save Shortcut" : "Add Shortcut"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
      navigationTitle={editing ? "Edit Shortcut" : "Add Shortcut"}
    >
      <Form.TextField title="Keys" placeholder="Hyper + O + G" {...itemProps.keys} />
      <Form.TextField title="Title" placeholder="Title" {...itemProps.title} />
      <Form.TextField title="Category" placeholder="Category" {...itemProps.category} />
      <Form.TagPicker id="tags" title="Tags" value={tags} onChange={setTags} placeholder="Tags">
        {knownTags.map((t) => (
          <Form.TagPicker.Item key={t} value={t} title={t} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
