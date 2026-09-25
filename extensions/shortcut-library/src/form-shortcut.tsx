import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useEffect, useState } from "react";
import { categoryExists, distinctCategories, generateId, loadShortcuts, resolveCategory, saveShortcuts } from "./data";
import { UNCATEGORIZED } from "./types";
import type { NewShortcut, Shortcut } from "./types";

interface FormValues {
  keys: string;
  title: string;
}

export function ShortcutForm({ existing, mutate }: { existing?: Shortcut; mutate: () => void }) {
  const editing = existing !== undefined;
  const { pop } = useNavigation();

  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [knownTags, setKnownTags] = useState<string[]>(existing?.tags ?? []);
  const [knownCategories, setKnownCategories] = useState<string[]>(existing?.category ? [existing.category] : []);
  const [category, setCategory] = useState<string>(existing?.category ?? UNCATEGORIZED);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categoryPicked, setCategoryPicked] = useState(false);

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

  const typed = categoryFilter.trim();
  const query = typed.toLowerCase();
  const existingCategories = [UNCATEGORIZED, ...knownCategories];
  const visibleCategories = existingCategories.filter((c) => !query || c.toLowerCase().includes(query));
  const canCreate = typed.length > 0 && !categoryExists(existingCategories, typed);
  const showCurrent = category !== UNCATEGORIZED && !visibleCategories.includes(category);

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      keys: existing?.keys ?? "",
      title: existing?.title ?? "",
    },
    validation: {
      title: FormValidation.Required,
      keys: FormValidation.Required,
    },
    async onSubmit(values) {
      const cleaned = tags.map((t) => t.trim()).filter((t) => t.length > 0);

      const shortcut: NewShortcut = {
        category: resolveCategory(category, categoryPicked, typed, existingCategories),
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
      <Form.Dropdown
        id="category"
        title="Category"
        placeholder="Category"
        filtering={false}
        value={category}
        onChange={(value) => {
          setCategory(value);
          setCategoryPicked(true);
        }}
        onSearchTextChange={(text) => {
          setCategoryFilter(text);
          setCategoryPicked(false);
        }}
      >
        {visibleCategories.map((c) => (
          <Form.Dropdown.Item key={c} value={c} title={c} />
        ))}
        {showCurrent && <Form.Dropdown.Item key={category} value={category} title={category} />}
        {canCreate && <Form.Dropdown.Item key="__create" value={typed} title={`Create new: ${typed}`} />}
      </Form.Dropdown>
      <Form.TagPicker id="tags" title="Tags" value={tags} onChange={setTags} placeholder="Tags">
        {knownTags.map((t) => (
          <Form.TagPicker.Item key={t} value={t} title={t} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
