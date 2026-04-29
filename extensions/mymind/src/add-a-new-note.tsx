import { Form, ActionPanel, Action, showToast, Toast, popToRoot } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { createObject, MyMindApiError } from "./api";

interface FormValues {
  title: string;
  content: string;
  tags: string;
}

export default function Command() {
  async function handleSubmit(values: FormValues) {
    if (!values.content.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Note content is required" });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating note…" });
    try {
      const tags = values.tags
        ? values.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined;

      await createObject({
        kind: "note",
        markdown: values.content,
        title: values.title || undefined,
        tags,
      });

      toast.style = Toast.Style.Success;
      toast.title = "Note created";
      await popToRoot();
    } catch (error) {
      toast.hide();
      if (error instanceof MyMindApiError && error.isUnauthorized) {
        await showFailureToast(error, { title: "Authentication required — check your access key" });
      } else {
        await showFailureToast(error, { title: "Failed to create note" });
      }
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new note in mymind. Markdown is supported." />
      <Form.TextField id="title" title="Title" placeholder="Optional title" />
      <Form.TextField id="tags" title="Tags" placeholder="Comma-separated, optional" />
      <Form.TextArea id="content" title="Content" placeholder="Write your note in markdown…" enableMarkdown />
    </Form>
  );
}
