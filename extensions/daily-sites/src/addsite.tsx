import React, { useEffect, useState } from "react";
import { ActionPanel, Form, Action, showToast, Toast } from "@raycast/api";
import type { Site } from "./types";
import { loadSites, saveSites, getCategories } from "./utils";

interface AddSitesFormProps {
  onDone: () => void;
  initialValues?: Site;
}

// Helper to validate URL syntax + protocol
function isValidHttpUrl(input: string): boolean {
  try {
    const url = new URL(input.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function AddSitesForm({ onDone, initialValues }: AddSitesFormProps) {
  const initialCat = initialValues?.category ?? "uncategorized";

  const [showErrors, setShowErrors] = useState(false);
  const [categories, setCategories] = useState<string[]>(() => Array.from(new Set([initialCat, "custom"])));
  const [name, setName] = useState(initialValues?.name ?? "");
  // Default URL value to "https://" when creating a new site
  const [url, setUrl] = useState(initialValues?.url ?? "https://");
  const [category, setCategory] = useState(initialCat);
  const [customCategory, setCustomCategory] = useState("");

  useEffect(() => {
    let isActive = true;

    (async () => {
      const all = await loadSites();
      if (!isActive) {
        // component unmounted—abort
        return;
      }
      const baseCats = getCategories(all);
      setCategories(Array.from(new Set([initialCat, "custom", ...baseCats])));
    })();

    return () => {
      // flip the flag on unmount
      isActive = false;
    };
  }, [initialCat]);

  // Validation rules
  const nameError = name.trim() === "" ? "Name is required" : undefined;
  const urlError =
    url.trim() === ""
      ? "URL is required"
      : !isValidHttpUrl(url)
        ? "Must be a valid http:// or https:// URL"
        : undefined;

  async function handleSubmit(values: { name: string; url: string; category: string; customCategory?: string }) {
    setShowErrors(true);
    if (nameError || urlError) {
      return;
    }

    const finalCategory =
      values.category === "custom" ? values.customCategory?.trim() || "uncategorized" : values.category;

    const newSite: Site = {
      name: values.name.trim(),
      url: values.url.trim(),
      category: finalCategory,
    };

    const existing = await loadSites();
    const isDuplicate = !initialValues && existing.some((s) => s.url === newSite.url);
    if (isDuplicate) {
      showToast(Toast.Style.Failure, "A site with this URL already exists");
      return;
    }
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
        placeholder="My Favorite Site"
        value={name}
        onChange={(v) => {
          setName(v);
          setShowErrors(false);
        }}
        error={showErrors ? nameError : undefined}
      />
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://"
        value={url}
        onChange={(v) => {
          setUrl(v);
          setShowErrors(false);
        }}
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

// Wrapper so Raycast always passes onDone
export default function AddSiteCommand() {
  return <AddSitesForm onDone={() => {}} />;
}
