import React from "react";
import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { Bookmark, updateBookmark } from "../lib/api";

export default function EditBookmarkForm({
  bookmark,
  onSave,
}: {
  bookmark: Bookmark;
  onSave: () => void;
}) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: {
    title: string;
    description: string;
    tags: string;
    isPrivate: boolean;
  }) {
    setIsLoading(true);
    try {
      await updateBookmark(bookmark._id, {
        title: values.title || undefined,
        description: values.description || undefined,
        tags: values.tags
          ? values.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
        isPrivate: values.isPrivate,
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Bookmark updated!",
      });
      onSave();
      pop();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update",
        message: String(e),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Edit Bookmark"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="URL" text={bookmark.url} />
      <Form.TextField
        id="title"
        title="Title"
        defaultValue={bookmark.title ?? ""}
        placeholder="Bookmark title"
      />
      <Form.TextArea
        id="description"
        title="Description"
        defaultValue={bookmark.description ?? ""}
        placeholder="Short description"
      />
      <Form.TextField
        id="tags"
        title="Tags"
        defaultValue={(bookmark.tags ?? []).join(", ")}
        placeholder="Comma-separated tags"
      />
      <Form.Checkbox
        id="isPrivate"
        label="Private"
        defaultValue={bookmark.isPrivate ?? false}
      />
    </Form>
  );
}
