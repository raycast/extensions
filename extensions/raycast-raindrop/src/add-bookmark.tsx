import { useState, useEffect, useCallback } from "react";
import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  Clipboard,
  getSelectedText,
  Icon,
} from "@raycast/api";
import { createBookmark, getCollections } from "./api";
import type { RaindropCollection } from "./types";

export default function AddBookmark() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");
  const [collectionId, setCollectionId] = useState<string>("0");
  const [collections, setCollections] = useState<RaindropCollection[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-fill from clipboard or selected text
  useEffect(() => {
    async function autofill() {
      try {
        // Try reading selected text first (often a URL)
        const selected = await getSelectedText();
        if (selected && isValidUrl(selected)) {
          setUrl(selected);
          return;
        }
      } catch {
        // No selected text, try clipboard
      }

      try {
        const clipText = await Clipboard.readText();
        if (clipText && isValidUrl(clipText.trim())) {
          setUrl(clipText.trim());
        }
      } catch {
        // No clipboard access
      }
    }
    autofill();
  }, []);

  // Load collections for the dropdown
  useEffect(() => {
    async function load() {
      try {
        const res = await getCollections();
        if (res.result) {
          setCollections(res.items);
        }
      } catch {
        // Non-critical — user can still add to "All"
      }
    }
    load();
  }, []);

  const isValidUrl = (text: string): boolean => {
    try {
      new URL(text);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!url.trim()) {
      showToast({ style: Toast.Style.Failure, title: "URL is required" });
      return;
    }

    if (!isValidUrl(url.trim())) {
      showToast({ style: Toast.Style.Failure, title: "Invalid URL" });
      return;
    }

    setIsLoading(true);
    try {
      const tagArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await createBookmark({
        link: url.trim(),
        title: title.trim() || undefined,
        note: note.trim() || undefined,
        tags: tagArray.length > 0 ? tagArray : undefined,
        collection: { $id: parseInt(collectionId, 10) },
      });

      if (res.result) {
        await showToast({
          style: Toast.Style.Success,
          title: "Bookmark saved!",
        });
        // Reset form
        setUrl("");
        setTitle("");
        setNote("");
        setTags("");
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to save",
          message: res.errorMessage || "Unknown error",
        });
      }
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }, [url, title, note, tags, collectionId]);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Bookmark"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://example.com"
        value={url}
        onChange={setUrl}
      />
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Bookmark title (optional, auto-fetched)"
        value={title}
        onChange={setTitle}
      />
      <Form.TextArea
        id="note"
        title="Note"
        placeholder="Add a note…"
        value={note}
        onChange={setNote}
      />
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="tag1, tag2, tag3"
        value={tags}
        onChange={setTags}
      />
      <Form.Dropdown
        id="collection"
        title="Collection"
        value={collectionId}
        onChange={setCollectionId}
      >
        <Form.Dropdown.Item value="0" title="All (Unsorted)" />
        {collections.map((col) => (
          <Form.Dropdown.Item
            key={col._id}
            value={String(col._id)}
            title={col.title}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
