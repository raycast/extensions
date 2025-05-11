import React, { useEffect, useState } from "react";
import {
  ActionPanel,
  Form,
  Action,
  showToast,
  Toast,
  confirmAlert,
  popToRoot,
  BrowserExtension,
  environment,
} from "@raycast/api";
import type { Site } from "./types";
import { decodeHtmlEntities, loadSites, saveSites, getCategories } from "./utils";

interface AddSitesFormProps {
  onDone: () => void;
  initialValues?: Site;
}

// Helper to ensure a well-formed http(s) URL, requiring at least one dot in the hostname
function isValidHttpUrl(input: string): boolean {
  const trimmed = input.trim();
  // remove `www.` if present right after the protocol
  const normalized = trimmed.replace(/^(https?:\/\/)www\./i, "$1");
  const pattern = /^https?:\/\/[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+([/?].*)?$/;
  return pattern.test(normalized);
}

// Fallback: derive a name from any host
function deriveNameFromUrl(input: string): string {
  try {
    const u = new URL(input.trim());
    // strip “www.”
    const host = u.hostname.replace(/^www\./i, "");
    const base = host.split(".")[0] || "";
    // remove trailing slash, split, grab first segment
    const segment = u.pathname.replace(/\/+$/, "").split("/")[1] || "";

    // decode any URL-encoded characters (e.g. %20)
    const decodedSegment = decodeURIComponent(segment);

    const cap = base.charAt(0).toUpperCase() + base.slice(1);
    return segment ? `${cap} – ${decodedSegment}` : cap;
  } catch {
    return "";
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
  const [lastFetchedUrl, setLastFetchedUrl] = useState("");

  // Try to prepopulate from the Raycast Browser Extension if available
  useEffect(() => {
    if (!initialValues && environment.canAccess(BrowserExtension)) {
      BrowserExtension.getTabs()
        .then((tabs) => {
          const activeTab = tabs.find((t) => t.active);
          if (activeTab?.url) {
            setUrl(activeTab.url);
            setLastFetchedUrl(activeTab.url);
          }
          if (activeTab?.title) {
            setName(activeTab.title);
          }
        })
        .catch(() => {
          // user declined or extension not installed; fall back to manual entry
        });
    }
  }, [initialValues]);

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
  const urlError =
    url.trim() === ""
      ? "URL is required"
      : !isValidHttpUrl(url)
        ? "Must be a valid http:// or https:// URL"
        : undefined;
  const nameError = name.trim() === "" ? "Name is required" : undefined;

  // Whenever the URL becomes valid (and hasn't been fetched yet),
  // fetch its <title> and, if the name is still blank, populate it.
  useEffect(() => {
    if (urlError || url === lastFetchedUrl) {
      return;
    }
    if (isValidHttpUrl(url)) {
      fetch(url)
        .then((res) => res.text())
        .then((html) => {
          const m = html.match(/<title>([\s\S]*?)<\/title>/i);
          let title = m ? decodeHtmlEntities(m[1].trim()) : "";
          // if it looks bogus, or empty, fallback:
          if (!title || /just a moment/i.test(title)) {
            title = deriveNameFromUrl(url);
          }
          setName(title);
        })
        .catch(() => {
          // ALWAYS fallback on network errors
          setName(deriveNameFromUrl(url));
        })
        .finally(() => {
          setLastFetchedUrl(url);
        });
    }
  }, [url, urlError, lastFetchedUrl]);

  async function handleSubmit(values: { url: string; name: string; category: string; customCategory?: string }) {
    setShowErrors(true);
    if (nameError || urlError) {
      return;
    }

    const finalCategory =
      values.category === "custom" ? values.customCategory?.trim() || "uncategorized" : values.category;

    const newSite: Site = {
      url: values.url.trim(),
      name: values.name.trim(),
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
    setCategories(getCategories(updated));

    if (again) {
      // reset form fields
      setUrl("https://");
      setName("");
      setCategory(finalCategory);
      setCustomCategory(finalCategory === "custom" ? customCategory.trim() : "");
      setShowErrors(false);
      // reset fetch tracker so we can fetch new titles
      setLastFetchedUrl("");
      return;
    }

    await showToast(Toast.Style.Success, initialValues ? "Site updated" : "Site added");

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
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Site title (auto‐fetched)"
        value={name}
        onChange={(v) => {
          setName(v);
          setShowErrors(false);
        }}
        error={showErrors ? nameError : undefined}
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

// Direct‐launch command wrapper
export default function AddSiteCommand() {
  return (
    <AddSitesForm
      onDone={async () => {
        // runs when Add Site is invoked directly
        try {
          // navigate back to root
          await popToRoot();
        } catch (error) {
          console.error("popToRoot failed:", error);
          await showToast(Toast.Style.Failure, "Navigation failed");
        }
      }}
    />
  );
}
