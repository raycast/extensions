import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getApiClient } from "./api";
import { Note } from "./types";

interface EditNoteProps {
  note: Note;
  onNoteUpdated: () => void;
}

export default function EditNote({ note, onNoteUpdated }: EditNoteProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Load available tags from existing notes
  useEffect(() => {
    async function loadTags() {
      try {
        const api = getApiClient();
        if (!api.isConfigured()) return;

        const notes = await api.getNotes({ limit: 100 });
        const tagSet = new Set<string>();
        notes.forEach((n) => {
          n.tags?.forEach((tag) => tagSet.add(tag));
        });
        setAvailableTags(Array.from(tagSet).sort());
      } catch (error) {
        console.error("Failed to load tags:", error);
      }
    }
    loadTags();
  }, []);

  async function handleSubmit(values: {
    content: string;
    selectedTags: string[];
    newTags: string;
    state: "public" | "private";
  }) {
    setIsLoading(true);

    try {
      const api = getApiClient();

      // Combine selected tags and new tags
      const newTags = values.newTags
        .split(/[,\s]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const allTags = [...new Set([...values.selectedTags, ...newTags])];

      await api.updateNote(note.id, {
        content: values.content,
        tags: allTags,
        state: values.state,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Note updated",
        message: "Your note has been updated successfully",
      });

      onNoteUpdated();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update note",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Note" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Enter note content..."
        defaultValue={note.content}
      />
      <Form.TagPicker
        id="selectedTags"
        title="Select Tags"
        placeholder="Select existing tags"
        defaultValue={note.tags || []}
      >
        {availableTags.map((tag) => (
          <Form.TagPicker.Item key={tag} value={tag} title={tag} />
        ))}
      </Form.TagPicker>
      <Form.TextField
        id="newTags"
        title="Add New Tags"
        placeholder="new-tag1, new-tag2 (comma or space separated)"
        defaultValue=""
        info="Enter new tags here. They will be combined with selected tags above."
      />
      <Form.Dropdown id="state" title="State" defaultValue={note.state}>
        <Form.Dropdown.Item value="public" title="Public" />
        <Form.Dropdown.Item value="private" title="Private" />
      </Form.Dropdown>
    </Form>
  );
}
