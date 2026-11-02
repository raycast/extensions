import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { categories, categoryLabels, loadCategories, restoreLegacyCategories, saveCategories } from "./categories";

export function CategorySettings({ onSave }: { onSave: () => void }) {
  const { pop } = useNavigation();
  const [selected, setSelected] = useState<Set<string>>(new Set(categories));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    loadCategories()
      .then((values) => {
        if (active) setSelected(new Set(values));
      })
      .catch(() => {
        if (active) setError("Saved settings could not be read. All categories are selected; save to repair them.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function save(legacy = false) {
    if (loading || saving) return;
    setSaving(true);
    try {
      if (legacy) await restoreLegacyCategories();
      else await saveCategories(categories.filter((category) => selected.has(category)));
      pop();
      onSave();
    } catch (failure) {
      await showToast({ style: Toast.Style.Failure, title: "Could Not Save Categories", message: String(failure) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Form
      navigationTitle="What to Hide"
      isLoading={loading || saving}
      actions={
        loading || saving ? undefined : (
          <ActionPanel>
            <Action.SubmitForm title="Save and Scan Current Clipboard" onSubmit={() => save()} />
            <Action
              title="Select All Categories"
              icon={Icon.Checkmark}
              onAction={() => setSelected(new Set(categories))}
            />
            <Action title="Use Legacy Category Settings" icon={Icon.Undo} onAction={() => save(true)} />
          </ActionPanel>
        )
      }
    >
      <Form.Description
        text={
          error ??
          "Choose the categories to hide in both commands. Custom Regex always applies independently. Saving scans the current clipboard again."
        }
      />
      {categories.map((category, index) => (
        <Form.Checkbox
          key={category}
          id={category}
          title={index === 0 ? "What to Hide" : ""}
          label={categoryLabels[category]}
          value={selected.has(category)}
          onChange={(enabled) =>
            setSelected((previous) => {
              const next = new Set(previous);
              if (enabled) next.add(category);
              else next.delete(category);
              return next;
            })
          }
        />
      ))}
    </Form>
  );
}
