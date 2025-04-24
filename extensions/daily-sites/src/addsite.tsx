import React, { useEffect, useState } from "react";
import { ActionPanel, Form, Action, showToast, Toast } from "@raycast/api";
import type { Site } from "./types";
import { loadSites, saveSites, getCategories } from "./utils";

interface AddSitesFormProps {
  onDone: () => void;
  initialValues?: Site;
}

export function AddSitesForm({ onDone, initialValues }: AddSitesFormProps) {
  const initialCat = initialValues?.category ?? "uncategorized";

  // whether to display field error messages
  const [showErrors, setShowErrors] = useState<boolean>(false);

  // form state
  const [categories, setCategories] = useState<string[]>(() => Array.from(new Set([initialCat, "custom"])));
  const [name, setName] = useState<string>(initialValues?.name ?? "");
  const [url, setUrl] = useState<string>(initialValues?.url ?? "");
  const [category, setCategory] = useState<string>(initialCat);
  const [customCategory, setCustomCategory] = useState<string>("");

  // load existing categories
  useEffect(() => {
    (async () => {
      const all = await loadSites();
      const baseCategories = getCategories(all);
      const merged = Array.from(new Set([initialCat, "custom", ...baseCategories]));
      setCategories(merged);
    })();
  }, [initialCat]);

  // validation rules
  const nameError = name.trim() === "" ? "Name is required" : undefined;
  const urlError = url.trim() === "" ? "URL is required" : undefined;

  async function handleSubmit(values: { name: string; url: string; category: string; customCategory?: string }) {
    // enable showing errors
    setShowErrors(true);

    // only proceed if valid
    if (nameError || urlError) {
      return;
    }

    // determine final category
    const finalCategory =
      values.category === "custom" ? values.customCategory?.trim() || "uncategorized" : values.category;

    const newSite: Site = {
      name: values.name.trim(),
      url: values.url.trim(),
      category: finalCategory,
    };

    // persist
    const existing = await loadSites();
    const updated = initialValues
      ? existing.map((s) => (s.url === initialValues.url ? newSite : s))
      : [...existing, newSite];

    await saveSites(updated);
    await showToast(Toast.Style.Success, initialValues ? "Site updated" : "Site added");
    onDone();
  }

  return (
    <Form
      navigationTitle={initialValues ? "Edit Site" : "Add Site"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={initialValues ? "Update" : "Add"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        value={name}
        onChange={(value) => {
          setName(value);
          setShowErrors(false);
        }}
        placeholder="My Favorite Site"
        error={showErrors ? nameError : undefined}
      />
      <Form.TextField
        id="url"
        title="URL"
        value={url}
        onChange={(value) => {
          setUrl(value);
          setShowErrors(false);
        }}
        placeholder="https://example.com"
        error={showErrors ? urlError : undefined}
      />
      <Form.Dropdown id="category" title="Category" value={category} onChange={setCategory}>
        <Form.Dropdown.Section title="Default">
          <Form.Dropdown.Item key="uncategorized" title="Uncategorized" value="uncategorized" />
          <Form.Dropdown.Item key="custom" title="Custom" value="custom" />
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="Saved Categories">
          {categories
            .filter((cat) => cat !== "uncategorized" && cat !== "custom")
            .map((cat) => (
              <Form.Dropdown.Item key={cat} title={cat} value={cat} />
            ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>

      {category === "custom" && (
        <Form.TextField
          id="customCategory"
          title="Custom Category"
          placeholder="Enter custom category"
          value={customCategory}
          onChange={setCustomCategory}
        />
      )}
    </Form>
  );
}

// Default command entrypoint that supplies a no-op onDone
export default function AddSiteCommand() {
  return <AddSitesForm onDone={() => {}} />;
}
