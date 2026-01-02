import React, { useState, useEffect } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
  Icon,
  showHUD,
} from "@raycast/api";
import { createPrompt, fetchCategories, fetchTags } from "./api";
import type { Category, TagWithDetails } from "./types";

export default function Command() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableTags, setAvailableTags] = useState<TagWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [fetchedCategories, fetchedTags] = await Promise.all([
        fetchCategories(),
        fetchTags(),
      ]);

      setCategories(fetchedCategories);
      setAvailableTags(fetchedTags);

      // Set default category if available
      if (fetchedCategories.length > 0) {
        setCategoryId(fetchedCategories[0].id);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to load data",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validate
    if (!name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Name is required",
      });
      return;
    }

    if (!content.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Content is required",
      });
      return;
    }

    if (!categoryId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Category is required",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await createPrompt({
        name: name.trim(),
        content: content.trim(),
        categoryId,
        description: description.trim() || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        visibility: "private",
      });

      await showHUD(`Created prompt "${result.name}"`);
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to create prompt",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Prompt"
            onSubmit={handleSubmit}
            icon={Icon.Plus}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="My awesome prompt"
        value={name}
        onChange={setName}
      />

      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Enter your prompt content here...

Use {{variable}} syntax for variables."
        value={content}
        onChange={setContent}
        enableMarkdown
      />

      <Form.Dropdown
        id="category"
        title="Category"
        value={categoryId}
        onChange={setCategoryId}
      >
        {categories.map((category) => (
          <Form.Dropdown.Item
            key={category.id}
            title={category.name}
            value={category.id}
            icon={category.icon}
          />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="description"
        title="Description"
        placeholder="Optional description"
        value={description}
        onChange={setDescription}
      />

      <Form.TextField
        id="sourceUrl"
        title="Source URL"
        placeholder="https://..."
        value={sourceUrl}
        onChange={setSourceUrl}
      />

      <Form.TagPicker
        id="tags"
        title="Tags"
        value={selectedTags}
        onChange={setSelectedTags}
      >
        {availableTags.map((tag) => (
          <Form.TagPicker.Item
            key={tag.id}
            value={tag.name}
            title={tag.name}
            icon={Icon.Tag}
          />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
