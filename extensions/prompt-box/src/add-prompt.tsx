import { Form, ActionPanel, Action, showToast, Toast, popToRoot } from "@raycast/api";
import { useState } from "react";
import { createPrompt } from "./api";
import { CreatePromptRequest } from "./types";
import { getCachedPrompts, setCachedPrompts } from "./storage";

interface FormValues {
  title: string;
  content: string;
}

export default function AddPrompt() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: FormValues) {
    if (!values.title.trim() || !values.content.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Submission Failed",
        message: "Title and content cannot be empty",
      });
      return;
    }

    setIsLoading(true);

    try {
      const promptData: CreatePromptRequest = {
        title: values.title.trim(),
        content: values.content.trim(),
      };

      const newPrompt = await createPrompt(promptData);

      // Add the newly created prompt to local cache
      try {
        const cachedPrompts = await getCachedPrompts();
        const updatedPrompts = [newPrompt, ...cachedPrompts];
        await setCachedPrompts(updatedPrompts);
      } catch (cacheError) {
        console.error("Failed to update cache:", cacheError);
        // Cache update failure doesn't affect main flow, just log the error
      }

      showToast({
        style: Toast.Style.Success,
        title: "✅ Prompt Added!",
        message: "New prompt has been successfully added",
      });

      // Automatically close the form
      popToRoot();
    } catch (error) {
      console.error("Failed to add prompt:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Add Failed",
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
          <Action.SubmitForm
            title="Add Prompt"
            onSubmit={handleSubmit}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Enter prompt title" autoFocus />
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Enter prompt content"
        enableMarkdown
      />
      <Form.Description text="Note: Tags and Description can be added later on the web interface" />
    </Form>
  );
}
