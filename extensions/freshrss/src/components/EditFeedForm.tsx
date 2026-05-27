import { useState, useEffect } from "react";
import { Form, Action, ActionPanel, showToast, Toast } from "@raycast/api";
import { getCategories, editFeed, FreshRSSAuthError, FreshRSSApiError } from "../api/freshrss";
import type { Category } from "../api/types";

type EditFeedFormProps = {
  feedId: string;
  currentTitle: string;
  onRefresh?: () => void;
};

export function EditFeedForm({ feedId, currentTitle, onRefresh }: EditFeedFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSubmit(values: { title: string; category?: string }) {
    const newTitle = values.title.trim();
    if (!newTitle) {
      await showToast({ style: Toast.Style.Failure, title: "Validation Error", message: "Feed title cannot be empty" });
      return;
    }

    try {
      await editFeed(feedId, {
        title: newTitle !== currentTitle ? newTitle : undefined,
        category: values.category || undefined,
      });
      await showToast({ style: Toast.Style.Success, title: "Feed Updated" });
      onRefresh?.();
    } catch (error: unknown) {
      const message =
        error instanceof FreshRSSAuthError || error instanceof FreshRSSApiError
          ? error.message
          : "Failed to update feed.";
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Feed" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Feed Title" defaultValue={currentTitle} />
      <Form.Dropdown id="category" title="Category" info="Move feed to a category">
        <Form.Dropdown.Item value="" title="No category" />
        {categories.map((cat) => (
          <Form.Dropdown.Item key={cat.id} value={cat.id} title={cat.label} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}