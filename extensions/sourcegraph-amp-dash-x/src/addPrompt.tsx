import {
  Action,
  ActionPanel,
  Form,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { savePrompt, getPrompts } from "./lib/storage";
import { showFailureToast } from "@raycast/utils";

interface FormValues {
  title: string;
  prompt: string;
  category: string;
  description: string;
}

export default function AddPrompt() {
  const [categories, setCategories] = useState<string[]>([]);
  const { pop } = useNavigation();

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const prompts = await getPrompts();
      const uniqueCategories = [
        ...new Set(prompts.map((p) => p.category).filter(Boolean)),
      ];
      setCategories(uniqueCategories.sort());
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  }

  async function handleSubmit(values: FormValues) {
    if (!values.title.trim()) {
      showToast(Toast.Style.Failure, "Title is required");
      return;
    }

    if (!values.prompt.trim()) {
      showToast(Toast.Style.Failure, "Prompt is required");
      return;
    }

    try {
      const description = values.description.trim();
      await savePrompt({
        title: values.title.trim(),
        prompt: values.prompt.trim(),
        category: values.category.trim() || "General",
        ...(description ? { description } : {}),
      });

      showToast(Toast.Style.Success, "Prompt saved successfully");
      pop();
    } catch (error) {
      showFailureToast(error, { title: "Failed to save prompt" });
      console.error("Save error:", error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Prompt" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Enter a descriptive title"
        info="A short, descriptive name for your prompt"
      />

      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="Enter your amp prompt here..."
      />

      <Form.TextField
        id="category"
        title="Category"
        placeholder="General"
        info="Group similar prompts together"
      />

      <Form.TextField
        id="description"
        title="Description"
        placeholder="Optional description of what this prompt does"
        info="Help others understand what this prompt is for"
      />

      {categories.length > 0 && (
        <>
          <Form.Separator />
          <Form.Description
            title="Existing Categories"
            text={categories.join(", ")}
          />
        </>
      )}
    </Form>
  );
}
