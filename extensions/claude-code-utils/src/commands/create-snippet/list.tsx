import { Action, ActionPanel, Form, showToast, Toast, LaunchProps, popToRoot } from "@raycast/api";
import { useState } from "react";
import { createSnippet } from "../../utils/claude-message";

export interface CreateSnippetProps {
  content?: string;
  title?: string;
}

export default function CreateSnippet(props?: LaunchProps<{ launchContext: CreateSnippetProps }> | CreateSnippetProps) {
  // Handle both LaunchProps and direct props
  const initialProps =
    props && "launchContext" in props ? props.launchContext : (props as CreateSnippetProps | undefined);

  const [title, setTitle] = useState(initialProps?.title || "");
  const [content, setContent] = useState(initialProps?.content || "");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    if (!content.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Content is required",
        message: "Please enter content for your snippet",
      });
      return;
    }

    setIsLoading(true);
    try {
      const snippetTitle = title.trim();
      await createSnippet(snippetTitle, content.trim());
      showToast({
        style: Toast.Style.Success,
        title: "Snippet created",
        message: snippetTitle ? `"${snippetTitle}" has been saved` : "Snippet has been saved",
      });
      // Pop back to the previous view (browse-snippets list)
      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create snippet",
        message: String(error),
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
          <Action.SubmitForm title="Create Snippet" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title (Optional)"
        placeholder="Enter snippet title..."
        value={title}
        onChange={setTitle}
      />
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Enter snippet content..."
        value={content}
        onChange={setContent}
      />
    </Form>
  );
}
