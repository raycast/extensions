import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
} from "@raycast/api";
import { useForm, FormValidation, usePromise } from "@raycast/utils";
import React, { useState } from "react";
import { createClip, getTags } from "./utils/api";

interface FormValues {
  title: string;
  content: string;
  url: string;
  newTags: string;
}

function validateUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  try {
    new URL(value.trim());
    return undefined;
  } catch {
    return "Enter a valid URL";
  }
}

function parseTagsInput(input: string): string[] {
  if (!input?.trim()) return [];
  const tags = input
    .split(/[,;\n]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(tags)];
}

export default function Command() {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data: existingTags = [] } = usePromise(getTags, [], {
    onError: () => {
      showToast({
        style: Toast.Style.Failure,
        title: "Could not load tags",
        message: "You can still create the note without tags.",
      });
    },
  });

  const existingTagsList = Array.isArray(existingTags) ? existingTags : [];

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      newTags: "",
    },
    onSubmit: async (values) => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Saving note...",
      });
      try {
        const newTagsParsed = parseTagsInput(values.newTags);
        const allTags = [...new Set([...selectedTags, ...newTagsParsed])];
        await createClip({
          title: values.title,
          content: values.content,
          url: values.url?.trim() || undefined,
          tags: allTags.length > 0 ? allTags : undefined,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Note Saved";
        popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to save note";
        toast.message =
          error instanceof Error ? error.message : "Unknown error";
      }
    },
    validation: {
      title: FormValidation.Required,
      url: validateUrl,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm title="Create Note" onSubmit={handleSubmit} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.title}
        id="title"
        title="Title"
        placeholder="What's on your mind?"
      />
      <Form.TextArea
        {...itemProps.content}
        id="content"
        title="Content"
        placeholder="Add more details..."
      />
      <Form.TextField
        {...itemProps.url}
        id="url"
        title="URL"
        placeholder="https://example.com (optional)"
      />
      <Form.TagPicker
        id="tags"
        title="Tags"
        value={selectedTags}
        onChange={setSelectedTags}
        placeholder="Select existing tags…"
      >
        {(existingTagsList ?? []).map((tag) => (
          <Form.TagPicker.Item key={tag} value={tag} title={tag} />
        ))}
      </Form.TagPicker>
      <Form.TextField
        {...itemProps.newTags}
        id="newTags"
        title="Add new tags"
        placeholder="e.g. work, ideas (comma-separated)"
      />
    </Form>
  );
}
