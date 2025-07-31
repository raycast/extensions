// @ts-nocheck: Raycast API has fundamental React type compatibility issues
import {
  Action,
  ActionPanel,
  Form,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import React, { useState, useEffect } from "react";
import {
  savePrompt,
  updatePrompt,
  getCategories,
  Prompt,
} from "../lib/storage";

interface PromptFormProps {
  prompt?: Prompt;
  onSave?: () => void;
}

interface FormValues {
  title: string;
  prompt: string;
  category: string;
  description: string;
}

export default function PromptForm({ prompt, onSave }: PromptFormProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();
  const isEditing = !!prompt;

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const cats = await getCategories();
      setCategories(cats);
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

    setIsLoading(true);

    try {
      const description = values.description.trim();
      if (isEditing && prompt) {
        await updatePrompt(prompt.id, {
          title: values.title.trim(),
          prompt: values.prompt.trim(),
          category: values.category.trim() || "General",
          ...(description ? { description } : {}),
        });
        showToast(Toast.Style.Success, "Prompt updated successfully");
      } else {
        await savePrompt({
          title: values.title.trim(),
          prompt: values.prompt.trim(),
          category: values.category.trim() || "General",
          ...(description ? { description } : {}),
        });
        showToast(Toast.Style.Success, "Prompt saved successfully");
      }

      onSave?.();
      pop();
    } catch (error) {
      showFailureToast(error, { title: `Failed to ${isEditing ? "update" : "save"} prompt` });
    } finally {
    } finally {
      setIsLoading(false);
    }
  }

  function validateTitle(value: string | undefined): string | undefined {
    if (!value || !value.trim()) {
      return "Title is required";
    }
    return undefined;
  }

  function validatePrompt(value: string | undefined): string | undefined {
    if (!value || !value.trim()) {
      return "Prompt is required";
    }
    return undefined;
  }

  return (
    // @ts-expect-error: Raycast JSX components have Element/ReactNode type compatibility issues
    <Form
      actions={
        // @ts-expect-error: Raycast JSX components have Element/ReactNode type compatibility issues
        <ActionPanel>
          {/* @ts-expect-error: Raycast JSX components have Element/ReactNode type compatibility issues */}
          <Action.SubmitForm
            title={isEditing ? "Update Prompt" : "Save Prompt"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      {/* @ts-expect-error: Raycast JSX components have Element/ReactNode type compatibility issues */}
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Enter a descriptive title"
        info="A short, descriptive name for your prompt"
        {...(prompt?.title ? { defaultValue: prompt.title } : {})}
        onChange={() => {}}
        onBlur={(event) => {
          const error = validateTitle(event.target.value);
          if (error) {
            showToast(Toast.Style.Failure, error);
          }
        }}
      />

      {/* @ts-expect-error: Raycast JSX components have Element/ReactNode type compatibility issues */}
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="Enter your amp prompt here..."
        {...(prompt?.prompt ? { defaultValue: prompt.prompt } : {})}
        onChange={() => {}}
        onBlur={(event) => {
          const error = validatePrompt(event.target.value);
          if (error) {
            showToast(Toast.Style.Failure, error);
          }
        }}
      />

      {/* @ts-expect-error: Raycast JSX components have Element/ReactNode type compatibility issues */}
      <Form.Dropdown
        id="category"
        title="Category"
        defaultValue={prompt?.category || "General"}
        info="Group similar prompts together. Use 'Manage Categories' command to add/edit categories."
      >
        {/* @ts-expect-error: Raycast JSX components have Element/ReactNode type compatibility issues */}
        {categories.map((category) => (
          // @ts-expect-error: Raycast JSX components have Element/ReactNode type compatibility issues
          <Form.Dropdown.Item
            key={category}
            value={category}
            title={category}
          />
        ))}
      </Form.Dropdown>

      {/* @ts-expect-error: Raycast JSX components have Element/ReactNode type compatibility issues */}
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Optional description of what this prompt does"
        info="Help others understand what this prompt is for"
        {...(prompt?.description ? { defaultValue: prompt.description } : {})}
      />

      {categories.length > 0 && (
        <>
          {/* @ts-expect-error: Raycast JSX components have Element/ReactNode type compatibility issues */}
          <Form.Separator />
          {/* @ts-expect-error: Raycast JSX components have Element/ReactNode type compatibility issues */}
          <Form.Description
            title="Existing Categories"
            text={categories.join(", ")}
          />
        </>
      )}

      {isEditing && (
        <>
          {/* @ts-expect-error: Raycast JSX components have Element/ReactNode type compatibility issues */}
          <Form.Separator />
          {/* @ts-expect-error: Raycast JSX components have Element/ReactNode type compatibility issues */}
          <Form.Description
            title="Last Updated"
            text={prompt?.updatedAt.toLocaleString()}
          />
        </>
      )}
    </Form>
  );
}
