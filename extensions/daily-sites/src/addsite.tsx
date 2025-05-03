// addsite.tsx
import React, { useEffect, useState } from "react";
import { ActionPanel, Form, Action, showToast, Toast, confirmAlert, popToRoot } from "@raycast/api";
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
  const [url, setUrl] = useState(initialValues?.url ?? "https://");
  const [category, setCategory] = useState(initialCat);
  const [customCategory, setCustomCategory] = useState("");

  useEffect(() => {
    let isActive = true;
    (async () => {
      const all = await loadSites();
      if (!isActive) return;
      const baseCats = getCategories(all);
      setCategories(Array.from(new Set([initialCat, "custom", ...baseCats])));
    })();
    return () => {
      isActive = false;
    };
  }, [initialCat]);

  // validation rules
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

    // Prevent duplicates on add
    if (!initialValues) {
      if (existing.some((s) => s.url === newSite.url)) {
        await showToast(Toast.Style.Failure, "Site already exists");
        return;
      }
    } else {
      // Prevent duplicates on edit if URL changed to one that exists
      if (initialValues.url !== newSite.url && existing.some((s) => s.url === newSite.url)) {
        await showToast(Toast.Style.Failure, "Another site with that URL already exists");
        return;
      }
    }

    // persist
    const updated = initialValues
      ? existing.map((s) => (s.url === initialValues.url ? newSite : s))
      : [...existing, newSite];

    // Ask user if they want to add another (only in add mode)
    const again =
      !initialValues &&
      (await confirmAlert({
        title: "Add another site?",
        message: "Would you like to add one more site?",
        primaryAction: { title: "Yes" },
        dismissAction: { title: "No" },
      }));

    await saveSites(updated);
    await showToast(Toast.Style.Success, initialValues ? "Site updated" : "Site added");

    if (again) {
      // reset form fields
      setName("");
      setUrl("https://");
      setCategory("uncategorized");
      setCustomCategory("");
      setShowErrors(false);
      return;
    }

    // not adding another → navigate back
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
          onChange={(v) => setCustomCategory(v.trim())}
        />
      )}
    </Form>
  );
}

// Wrapper so Raycast always passes onDone
export default function AddSiteCommand() {
  return (
    <AddSitesForm
      onDone={async () => {
        // runs when Add Site is invoked directly
        await popToRoot();
      }}
    />
  );
}
