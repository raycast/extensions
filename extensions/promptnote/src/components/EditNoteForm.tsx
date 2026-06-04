import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  useNavigation,
  Icon,
} from "@raycast/api";
import { useState } from "react";
import { updateNote, useTags } from "../lib/hooks/useNotes";
import { Note } from "../lib/types";

interface EditNoteFormProps {
  note: Note;
  onSuccess: () => void;
}

export function EditNoteForm({ note, onSuccess }: EditNoteFormProps) {
  const { pop } = useNavigation();
  const { data: existingTags } = useTags();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: {
    title: string;
    tags: string[];
    newTag?: string;
  }) => {
    setIsLoading(true);

    try {
      // Combine selected tags with new tag if provided
      const tags = [...(values.tags || [])];
      if (values.newTag?.trim()) {
        const newTag = values.newTag.trim();
        if (!tags.includes(newTag)) {
          tags.push(newTag);
        }
      }

      await updateNote(note.id, {
        title: values.title.trim() || note.title,
        tags,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Note updated",
      });

      onSuccess();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update note",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Edit Note"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        defaultValue={note.title}
        placeholder="Note title"
      />

      <Form.Separator />

      <Form.TagPicker
        id="tags"
        title="Tags"
        defaultValue={note.tags || []}
        placeholder="Select tags"
      >
        {(existingTags || []).map((tag) => (
          <Form.TagPicker.Item key={tag} value={tag} title={tag} />
        ))}
      </Form.TagPicker>

      <Form.TextField
        id="newTag"
        title="New Tag"
        placeholder="Create a new tag (optional)"
        info="Use / for hierarchical tags (e.g., ai/prompts)"
      />
    </Form>
  );
}
