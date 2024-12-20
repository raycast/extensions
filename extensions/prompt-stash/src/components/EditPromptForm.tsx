import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState } from "react";
import { Prompt, PromptFormValues } from "../types";
import { usePrompt } from "../hooks";
import { TAGS } from "../config";

interface EditPromptFormProps {
  prompt: Prompt;
}

export default function EditPromptForm({ prompt }: EditPromptFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [, , update] = usePrompt();
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<PromptFormValues>({
    initialValues: {
      title: prompt.title,
      content: prompt.content,
      tags: prompt.tags,
      isFavorite: prompt.isFavorite,
    },
    validation: {
      title: (value) => {
        if (!value) {
          return "Title is required";
        }
        if (value.length < 3) {
          return "Title must be at least 3 characters";
        }
        if (value.length > 100) {
          return "Title must be less than 100 characters";
        }
      },
      content: (value) => {
        if (!value) {
          return "Prompt content is required";
        }
        if (value.length < 10) {
          return "Prompt content must be at least 10 characters";
        }
        if (value.length > 5000) {
          return "Prompt content must be less than 5000 characters";
        }
      },
      tags: (value) => {
        if (value && value.length > 10) {
          return "Maximum 10 tags allowed";
        }
      },
    },
    async onSubmit(values) {
      setIsLoading(true);
      try {
        const updatedPrompt: Prompt = {
          ...prompt,
          ...values,
        };
        await update(
          updatedPrompt,
          () => {
            showToast({
              style: Toast.Style.Success,
              title: "Prompt Updated! ",
              message: `"${values.title}" has been updated`,
            });
            pop();
          },
          () => {
            showToast({
              style: Toast.Style.Failure,
              title: "Error",
              message: "Failed to update prompt",
            });
          },
        );
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Prompt" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.title} title="Title" placeholder="Enter prompt title" />
      <Form.TextArea {...itemProps.content} title="Content" placeholder="Enter prompt content" />
      <Form.TagPicker {...itemProps.tags} title="Tags">
        {TAGS.map((tag) => (
          <Form.TagPicker.Item key={tag.value} value={tag.value} title={tag.title} icon={tag.icon} />
        ))}
      </Form.TagPicker>
      <Form.Checkbox {...itemProps.isFavorite} label="Favorite" />
    </Form>
  );
}
