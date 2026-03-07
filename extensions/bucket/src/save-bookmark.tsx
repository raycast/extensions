import React from "react";
import { Action, ActionPanel, Clipboard, Form, Icon, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { createBookmark, getFolders, Folder, moveBookmarksToFolder } from "./lib/api";

export default function SaveBookmark() {
  const [isLoading, setIsLoading] = useState(false);
  const [clipboardUrl, setClipboardUrl] = useState("");
  const [folders, setFolders] = useState<Folder[]>([]);

  useEffect(() => {
    // Auto-detect URL from clipboard
    Clipboard.readText().then((text) => {
      if (text && /^https?:\/\//i.test(text.trim())) {
        setClipboardUrl(text.trim());
      }
    });
    // Load folders for optional folder assignment
    getFolders()
      .then(setFolders)
      .catch(() => setFolders([]));
  }, []);

  async function handleSubmit(values: {
    url: string;
    title: string;
    description: string;
    tags: string;
    folderId: string;
  }) {
    const url = values.url.trim();
    if (!url) {
      await showToast({ style: Toast.Style.Failure, title: "URL is required" });
      return;
    }

    setIsLoading(true);
    try {
      const bookmark = await createBookmark({
        url,
        title: values.title || undefined,
        description: values.description || undefined,
        tags: values.tags
          ? values.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
      });

      // Move to folder if selected
      if (values.folderId && bookmark._id) {
        await moveBookmarksToFolder(values.folderId, [bookmark._id]).catch(() => {
          // Non-fatal — bookmark is saved, just not in folder
        });
      }

      await showHUD("✅ Bookmark saved!");
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save bookmark",
        message: String(e),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Save Bookmark"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Bookmark" icon={Icon.Bookmark} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        defaultValue={clipboardUrl}
        placeholder="https://example.com"
        autoFocus={!clipboardUrl}
        info={clipboardUrl ? "Detected from clipboard" : undefined}
      />
      <Form.TextField id="title" title="Title" placeholder="Optional title" />
      <Form.TextArea id="description" title="Description" placeholder="Optional description" />
      <Form.TextField id="tags" title="Tags" placeholder="Comma-separated tags, e.g. design, tools" />
      {folders.length > 0 && (
        <Form.Dropdown id="folderId" title="Folder" defaultValue="">
          <Form.Dropdown.Item value="" title="No folder" />
          {folders.map((f) => (
            <Form.Dropdown.Item value={f._id} title={f.name} icon={f.icon ?? Icon.Folder} key={f._id} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}
