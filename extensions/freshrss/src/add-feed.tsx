import { useState, useEffect, useCallback } from "react";
import { Form, Action, ActionPanel, showToast, Toast } from "@raycast/api";
import { addFeed, getCategories, FreshRSSAuthError, FreshRSSApiError } from "./api/freshrss";
import type { Category } from "./api/types";

export default function AddFeedCommand() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSubmit(values: { feedUrl: string; category?: string }) {
    const url = values.feedUrl.trim();

    if (!url) {
      await showToast({ style: Toast.Style.Failure, title: "Validation Error", message: "Feed URL cannot be empty" });
      return;
    }

    try {
      new URL(url);
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Validation Error", message: "Please enter a valid URL (e.g. https://example.com/feed.xml)" });
      return;
    }

    try {
      await addFeed(url, values.category);
      await showToast({ style: Toast.Style.Success, title: "Feed Added", message: url });
    } catch (error: unknown) {
      let message: string;
      if (error instanceof FreshRSSAuthError) {
        message = error.message;
      } else if (error instanceof FreshRSSApiError) {
        message = error.message;
      } else {
        message = "Failed to add feed. It may already exist or the URL may not be a valid RSS/Atom feed.";
      }
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Feed" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="feedUrl" title="Feed URL" placeholder="https://example.com/feed.xml" info="Enter the RSS or Atom feed URL to subscribe to" />
      <Form.Dropdown id="category" title="Category" info="Optional: assign the feed to a category">
        <Form.Dropdown.Item value="" title="No category" />
        {categories.map((cat) => (
          <Form.Dropdown.Item key={cat.id} value={cat.id} title={cat.label} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
