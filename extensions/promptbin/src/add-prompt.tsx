import { Action, ActionPanel, Form, showToast, Toast, closeMainWindow, popToRoot } from "@raycast/api";
import { PromptStore } from "./store";
import { Prompt } from "./types";
import { v4 as uuidv4 } from "uuid"; // You'll need to install this package


export default function AddPrompt() {
  async function handleSubmit(values: {
    title: string;
    content: string;
    category: string;
    tags: string;
  }) {
    try {
      const newPrompt: Prompt = {
        id: uuidv4(),
        title: values.title,
        content: values.content,
        category: values.category,
        tags: values.tags.split(",").map(tag => tag.trim()),
        dateCreated: new Date(),
        isFavorite: false
      };

      await PromptStore.savePrompt(newPrompt);
      await showToast({
        style: Toast.Style.Success,
        title: "Prompt saved successfully",
      });
      await popToRoot();
      await closeMainWindow();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save prompt",
      });
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
      <Form.TextField id="title" title="Title" placeholder="Enter prompt title" />
      <Form.TextArea id="content" title="Content" placeholder="Enter your prompt" />
      <Form.TextField id="category" title="Category" placeholder="e.g., Writing, Coding, Analysis" />
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="Enter tags separated by commas"
      />
    </Form>
  );
}