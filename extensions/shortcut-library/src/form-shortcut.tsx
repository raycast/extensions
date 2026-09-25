import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useEffect, useState } from "react";
import { distinctCategories, generateId, loadShortcuts, saveShortcuts } from "./data";
import { resolveCategory } from "./schema";
import { UNCATEGORIZED } from "./types";
import type { NewShortcut, Shortcut } from "./types";

interface FormValues {
  keys: string;
  title: string;
  category: string;
  createNew: boolean;
  newCategory: string;
}

export function ShortcutForm({ existing, mutate }: { existing?: Shortcut; mutate: () => void }) {
  const editing = existing !== undefined;
  const { pop } = useNavigation();

  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [knownTags, setKnownTags] = useState<string[]>(existing?.tags ?? []);
  const [knownCategories, setKnownCategories] = useState<string[]>([]);

  useEffect(() => {
    loadShortcuts().then((items) => {
      const tagSet = new Set<string>();
      for (const s of items) {
        if (s.id !== existing?.id) {
          for (const t of s.tags ?? []) tagSet.add(t);
        }
      }
      setKnownTags([...new Set([...(existing?.tags ?? []), ...tagSet])].sort());
      setKnownCategories(distinctCategories(items));
    });
  }, [existing?.id]);

  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    initialValues: {
      keys: existing?.keys ?? "",
      category: existing?.category ?? UNCATEGORIZED,
      title: existing?.title ?? "",
      createNew: false,
      newCategory: "",
    },
    validation: {
      title: FormValidation.Required,
      keys: FormValidation.Required,
      newCategory: (value) => {
        if (values.createNew && !value?.trim()) return "Category name is required";
      },
    },
    async onSubmit(values) {
      const cleaned = tags.map((t) => t.trim()).filter((t) => t.length > 0);

      const shortcut: NewShortcut = {
        category: resolveCategory(values.createNew, values.category, values.newCategory),
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
      {values.createNew ? (
        <Form.TextField title="Category" placeholder="Category name" {...itemProps.newCategory} />
      ) : (
        <Form.Dropdown title="Category" {...itemProps.category}>
          <Form.Dropdown.Item value={UNCATEGORIZED} title="Uncategorized" />
          {knownCategories.map((c) => (
            <Form.Dropdown.Item key={c} value={c} title={c} />
          ))}
          {values.category !== UNCATEGORIZED && !knownCategories.includes(values.category) && (
            <Form.Dropdown.Item key={values.category} value={values.category} title={values.category} />
          )}
        </Form.Dropdown>
      )}
      <Form.Checkbox title="New Category" label="Create a new category" {...itemProps.createNew} />
      <Form.TagPicker id="tags" title="Tags" value={tags} onChange={setTags} placeholder="Tags">
        {knownTags.map((t) => (
          <Form.TagPicker.Item key={t} value={t} title={t} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
