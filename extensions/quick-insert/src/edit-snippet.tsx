import { Form, Action, ActionPanel, showToast, Toast, useNavigation } from "@raycast/api";
import React, { useState } from "react";
import { updateSnippet } from "./utils/storage";
import { Snippet } from "./types";

interface EditSnippetProps {
  snippet: Snippet;
  onUpdated: () => void;
}

export default function EditSnippet({ snippet, onUpdated }: EditSnippetProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState(snippet.name);
  const [content, setContent] = useState(snippet.content);
  const [category, setCategory] = useState(snippet.category || "");
  const [tags, setTags] = useState(snippet.tags?.join(", ") || "");

  async function handleSubmit() {
    if (!name.trim()) {
      await showToast(Toast.Style.Failure, "Name is required");
      return;
    }

    if (!content.trim()) {
      await showToast(Toast.Style.Failure, "Content is required");
      return;
    }

    try {
      await updateSnippet(snippet.id, {
        name: name.trim(),
        content: content.trim(),
        category: category.trim() || undefined,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0),
      });

      await showToast(Toast.Style.Success, "Snippet Updated");
      onUpdated();
      pop();
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to update snippet");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Snippet" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="My Snippet" value={name} onChange={setName} autoFocus />
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Enter snippet content... Use {{date}}, {{year}}, {{clipboard}}, etc."
        value={content}
        onChange={setContent}
      />
      <Form.TextField
        id="category"
        title="Category"
        placeholder="email, code, etc."
        value={category}
        onChange={setCategory}
      />
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="work, personal (comma separated)"
        value={tags}
        onChange={setTags}
      />
      <Form.Description
        title="Template Variables"
        text="Available: {{date}}, {{year}}, {{clipboard}}, {{username}}, {{hostname}}"
      />
    </Form>
  );
}
