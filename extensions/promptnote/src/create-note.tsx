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
import { AuthWrapper } from "./components/AuthWrapper";
import { UtilityActionsSection } from "./components/CommonActions";
import { createNote } from "./lib/hooks/useNotes";
import { createSnippet } from "./lib/hooks/useSnippets";
import { useTags } from "./lib/hooks/useNotes";

function CreateNoteContent() {
  const { pop } = useNavigation();
  const { data: existingTags } = useTags();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: {
    title: string;
    content: string;
    tags: string[];
    newTag?: string;
  }) => {
    if (!values.content.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Content is required",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Combine selected tags with new tag if provided
      const tags = [...(values.tags || [])];
      if (values.newTag?.trim()) {
        tags.push(values.newTag.trim());
      }

      // Create the note
      const note = await createNote(values.title.trim() || "", tags);

      // Create the first snippet
      await createSnippet(note.id, values.content.trim(), "");

      await showToast({
        style: Toast.Style.Success,
        title: "Note created",
        message: note.title,
      });

      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create note",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create Note"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Note"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
          <UtilityActionsSection />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Note title (optional, auto-generated if empty)"
      />

      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Enter your prompt content..."
        enableMarkdown
        autoFocus
      />

      <Form.Separator />

      <Form.TagPicker id="tags" title="Tags" placeholder="Select existing tags">
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

export default function Command() {
  return (
    <AuthWrapper>
      <CreateNoteContent />
    </AuthWrapper>
  );
}
