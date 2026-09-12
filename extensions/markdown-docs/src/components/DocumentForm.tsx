import { Form, ActionPanel, Action, useNavigation, Icon } from "@raycast/api";
import { useState } from "react";
import type { Document } from "../types";
import { useDocuments } from "../hooks/useDocuments";

interface Props {
  document?: Document;
  content?: string;
}

export function DocumentForm({ document, content = "" }: Props) {
  const { pop } = useNavigation();
  const { createDocument, updateDocument, revalidate } = useDocuments();

  const [title, setTitle] = useState(document?.title || "");
  const [tags, setTags] = useState(document?.tags.join(", ") || "");
  const [shortcut, setShortcut] = useState(document?.shortcut || "");
  const [markdownContent, setMarkdownContent] = useState(content);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!title.trim()) return;

    setIsSubmitting(true);

    const parsedTags = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (document) {
        await updateDocument(
          document.id,
          {
            title: title.trim(),
            tags: parsedTags,
            shortcut: shortcut.trim() || undefined,
          },
          markdownContent,
        );
      } else {
        await createDocument(
          title.trim(),
          parsedTags,
          markdownContent,
          shortcut.trim() || undefined,
        );
      }
      revalidate();
      pop();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={document ? "Edit Document" : "Create Document"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={document ? "Save Changes" : "Create Document"}
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="My Cheatsheet"
        value={title}
        onChange={setTitle}
        autoFocus
      />
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="javascript, react, tips"
        info="Comma-separated list of tags for filtering"
        value={tags}
        onChange={setTags}
      />
      <Form.TextField
        id="shortcut"
        title="Quick Search Shortcut"
        placeholder="js"
        info="Short prefix for quick search (e.g., 'js: query' to search this doc)"
        value={shortcut}
        onChange={setShortcut}
      />
      <Form.Separator />
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="# My Document\n\nWrite your markdown here..."
        enableMarkdown
        value={markdownContent}
        onChange={setMarkdownContent}
      />
    </Form>
  );
}
