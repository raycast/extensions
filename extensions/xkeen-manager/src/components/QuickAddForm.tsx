import { Action, ActionPanel, Form, Toast, showToast } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { readRemoteFile } from "../lib/files";
import { applyQuickAdd } from "../lib/quickadd";
import {
  parseRoutingCategories,
  entryTypesForField,
  ENTRY_TYPES,
  type EntryType,
  type RoutingCategory,
} from "../lib/routing";
import { getPaths } from "../lib/utils";

const RAYCAST_CATEGORY_LABEL = "Manual Domains (Raycast)";

export function QuickAddForm(props: { onAfterSave?: () => void }) {
  const { configDir } = getPaths();
  const routingPath = `${configDir}/05_routing.json`;
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<RoutingCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("__raycast__");
  const [entryType, setEntryType] = useState<EntryType>("domain");

  function onCategoryChange(value: string) {
    setSelectedCategory(value);
    if (value === "__raycast__") {
      setEntryType("domain");
      return;
    }
    const num = parseInt(value, 10);
    const cat = categories.find((c) => c.number === num);
    if (cat) {
      const available = entryTypesForField(cat.field);
      if (available.length > 0 && !available.includes(entryType)) {
        setEntryType(available[0]);
      }
    }
  }

  async function loadCategories() {
    setIsLoading(true);
    try {
      const text = await readRemoteFile(routingPath);
      setCategories(parseRoutingCategories(text));
    } catch (e) {
      await showFailureToast(e, { title: "Load failed" });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCategories();
  }, []);

  const { handleSubmit, itemProps } = useForm<{ input: string }>({
    validation: {
      input: (value) => (value && value.trim() ? undefined : "Enter at least one value"),
    },
    onSubmit: async (values) => {
      const input = values.input.trim();
      setIsLoading(true);
      try {
        const categoryNumber = selectedCategory === "__raycast__" ? undefined : parseInt(selectedCategory, 10);
        const result = await applyQuickAdd({ rawInput: input, entryType, categoryNumber });
        const duplicateNote =
          result.skippedDuplicates > 0
            ? `, ${result.skippedDuplicates} duplicate${result.skippedDuplicates === 1 ? "" : "s"} skipped`
            : "";
        await showToast({
          style: Toast.Style.Success,
          title: "Added",
          message: `${result.added} added${duplicateNote} → ${result.categoryTitle}`,
        });
        props.onAfterSave?.();
        await loadCategories();
      } catch (e) {
        await showFailureToast(e, { title: "Failed" });
      } finally {
        setIsLoading(false);
      }
    },
  });

  const availableTypes = (() => {
    if (selectedCategory === "__raycast__") return entryTypesForField("domain");
    const num = parseInt(selectedCategory, 10);
    const cat = categories.find((c) => c.number === num);
    return cat ? entryTypesForField(cat.field) : entryTypesForField("domain");
  })();

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Apply" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="category" title="Category" value={selectedCategory} onChange={onCategoryChange}>
        <Form.Dropdown.Item key="__raycast__" value="__raycast__" title={RAYCAST_CATEGORY_LABEL} />
        {categories.map((c) => (
          <Form.Dropdown.Item key={String(c.number)} value={String(c.number)} title={`${c.number}. ${c.title}`} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="entryType" title="Entry Type" value={entryType} onChange={(v) => setEntryType(v as EntryType)}>
        {availableTypes.map((t) => (
          <Form.Dropdown.Item key={t} value={t} title={ENTRY_TYPES[t].label} />
        ))}
      </Form.Dropdown>
      <Form.TextArea title="Values" placeholder={ENTRY_TYPES[entryType].placeholder} {...itemProps.input} />
      <Form.Description text={`File: ${routingPath}`} />
    </Form>
  );
}
