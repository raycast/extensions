import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  popToRoot,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getApiClient } from "./api";

// Create Note command

export default function CreateNote() {
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [state, setState] = useState<string>("private");
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Load available tags from existing notes
  useEffect(() => {
    async function loadTags() {
      try {
        const api = getApiClient();
        if (!api.isConfigured()) return;

        const notes = await api.getNotes({ limit: 100 });
        const tagSet = new Set<string>();
        notes.forEach((note) => {
          note.tags?.forEach((tag) => tagSet.add(tag));
        });
        setAvailableTags(Array.from(tagSet).sort());
      } catch (error) {
        console.error("Failed to load tags:", error);
      }
    }
    loadTags();
  }, []);

  async function handleSubmit() {
    if (!content.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Content is required",
        message: "请输入笔记内容",
      });
      return;
    }

    setIsLoading(true);

    try {
      const api = getApiClient();

      // Combine selected tags and new tags
      const newTags = newTagInput
        .split(/[,\s]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const allTags = [...new Set([...selectedTags, ...newTags])];

      await api.createNote({
        content: content.trim(),
        tags: allTags.length > 0 ? allTags : undefined,
        state: state as "public" | "private",
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Note created",
        message: "笔记创建成功",
      });

      popToRoot();
    } catch (error) {
      // Error already shown by API client
      console.error("Failed to create note:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Note" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Write your note here..."
        value={content}
        onChange={setContent}
        enableMarkdown
      />

      <Form.TagPicker
        id="tags"
        title="Select Tags"
        placeholder="Select existing tags"
        value={selectedTags}
        onChange={setSelectedTags}
      >
        {availableTags.map((tag) => (
          <Form.TagPicker.Item key={tag} value={tag} title={tag} />
        ))}
      </Form.TagPicker>

      <Form.TextField
        id="newTags"
        title="Add New Tags"
        placeholder="new-tag1, new-tag2 (comma or space separated)"
        value={newTagInput}
        onChange={setNewTagInput}
        info="Enter new tags here. They will be combined with selected tags above."
      />

      <Form.Dropdown
        id="state"
        title="Visibility"
        value={state}
        onChange={setState}
      >
        <Form.Dropdown.Item value="private" title="🔒 Private" />
        <Form.Dropdown.Item value="public" title="🌍 Public" />
      </Form.Dropdown>
    </Form>
  );
}
