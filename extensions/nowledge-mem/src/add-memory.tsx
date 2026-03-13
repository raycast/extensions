import {
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  popToRoot,
} from "@raycast/api";
import { createMemory } from "./api";

export default function AddMemory() {
  async function handleSubmit(values: {
    content: string;
    title: string;
    importance: string;
  }) {
    if (!values.content.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Content is required",
      });
      return;
    }

    try {
      const importance = values.importance
        ? parseFloat(values.importance)
        : 0.5;
      const memory = await createMemory({
        content: values.content,
        title: values.title || undefined,
        importance,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Memory saved",
        message: memory.title || memory.id,
      });
      popToRoot();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Memory" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="What do you want to remember?"
        autoFocus
      />
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Short, searchable title (optional)"
      />
      <Form.Dropdown id="importance" title="Importance" defaultValue="0.5">
        <Form.Dropdown.Item value="0.9" title="Critical (0.9)" />
        <Form.Dropdown.Item value="0.7" title="Important (0.7)" />
        <Form.Dropdown.Item value="0.5" title="Normal (0.5)" />
        <Form.Dropdown.Item value="0.3" title="Minor (0.3)" />
      </Form.Dropdown>
    </Form>
  );
}
