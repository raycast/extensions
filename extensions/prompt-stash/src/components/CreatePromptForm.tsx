import { Action, ActionPanel, Form, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState } from "react";
import { Prompt, PromptFormValues } from "../types";
import { usePrompt } from "../hooks";
import { formConfig, TAGS } from "../config";

export default function CreatePromptForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [create] = usePrompt();
  const { pop } = useNavigation();

  const { handleSubmit, itemProps, reset } = useForm<PromptFormValues>({
    initialValues: {
      title: "",
      content: "",
      tags: [],
      isFavorite: false,
    },
    async onSubmit(values) {
      setIsLoading(true);
      try {
        const newPrompt: Prompt = {
          id: new Date().getTime().toString(),
          ...values,
          createdAt: new Date(),
        };
        await create(
          newPrompt,
          () => {
            showToast({
              style: Toast.Style.Success,
              title: "Prompt Created! 🎉",
              message: `"${values.title}" has been saved`,
            });
            reset();
            pop();
          },
          () => {
            showToast({
              style: Toast.Style.Failure,
              title: "Error",
              message: "Failed to save prompt",
            });
          },
        );
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
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
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Prompt" onSubmit={handleSubmit} icon={Icon.Document} />
          <Action
            title="Clear Form"
            icon={Icon.Trash}
            onAction={() => reset()}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.title}
        title="Title"
        placeholder="Enter a descriptive title for your prompt"
        autoFocus
      />
      <Form.TextArea
        {...itemProps.content}
        title="Prompt Content"
        placeholder="Enter your prompt here"
        enableMarkdown
      />
      <Form.TagPicker {...itemProps.tags} title="Tags" placeholder="Select existing or type to create new tags">
        {TAGS.map((tag) => (
          <Form.TagPicker.Item key={tag.value} value={tag.value} title={tag.title} icon={tag.icon} />
        ))}
      </Form.TagPicker>
      <Form.Checkbox {...itemProps.isFavorite} label="Add to Favorites" title="Favorite" />
      <Form.Description title="About" text={formConfig.ABOUT} />
      <Form.Separator />
      <Form.Description title="Tips" text={formConfig.TIPS} />
    </Form>
  );
}
