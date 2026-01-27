import React, { useState, useEffect } from "react";
import { ActionPanel, Action, List, Form, showToast, Toast, Alert, confirmAlert, useNavigation } from "@raycast/api";
import { FileCategory, DEFAULT_CATEGORIES, loadCategories, saveCategories } from "./utils/categories";

interface CategoryFormProps {
  category?: FileCategory;
  onSave: (category: FileCategory) => void;
}

function CategoryForm({ category, onSave }: CategoryFormProps) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [extensionsError, setExtensionsError] = useState<string | undefined>();

  function handleSubmit(values: { name: string; extensions: string }) {
    // Validate form
    if (!values.name.trim()) {
      setNameError("Category name is required");
      return;
    }

    if (!values.extensions.trim()) {
      setExtensionsError("Extensions are required");
      return;
    }

    // Parse extensions
    const extensions = values.extensions
      .split(",")
      .map((ext) => ext.trim())
      .filter((ext) => ext.length > 0)
      .map((ext) => (ext.startsWith(".") ? ext : `.${ext}`));

    if (extensions.length === 0) {
      setExtensionsError("At least one valid extension is required");
      return;
    }

    const newCategory: FileCategory = {
      name: values.name.trim(),
      extensions: extensions,
    };

    onSave(newCategory);
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Category" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Category Name"
        placeholder="e.g., ★ Pictures"
        defaultValue={category?.name || ""}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextArea
        id="extensions"
        title="File Extensions"
        placeholder="Enter extensions separated by commas (e.g., .jpg, .png, .gif)"
        defaultValue={category?.extensions.join(", ") || ""}
        error={extensionsError}
        onChange={() => setExtensionsError(undefined)}
      />
      <Form.Description
        title="Instructions"
        text="• Extensions should include the dot (e.g., .jpg, .png)
• Separate multiple extensions with commas
• Extensions are case-insensitive"
      />
    </Form>
  );
}

export default function ManageCategories() {
  const [categories, setCategories] = useState<FileCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    loadCategoriesFromStorage();
  }, []);

  async function loadCategoriesFromStorage() {
    try {
      const categories = await loadCategories();
      setCategories(categories);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load categories",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function saveCategoriesAndUpdate(newCategories: FileCategory[]) {
    try {
      await saveCategories(newCategories);
      setCategories(newCategories);
      await showToast({
        style: Toast.Style.Success,
        title: "Categories saved successfully",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save categories",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleAddCategory(category: FileCategory) {
    const updatedCategories = [...categories, category];
    await saveCategoriesAndUpdate(updatedCategories);
  }

  async function handleEditCategory(index: number, category: FileCategory) {
    const updatedCategories = [...categories];
    updatedCategories[index] = category;
    await saveCategoriesAndUpdate(updatedCategories);
  }

  async function handleDeleteCategory(index: number) {
    const category = categories[index];
    const confirmed = await confirmAlert({
      title: `Delete "${category.name}"?`,
      message: "This action cannot be undone.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      const updatedCategories = categories.filter((_, i) => i !== index);
      await saveCategoriesAndUpdate(updatedCategories);
    }
  }

  async function handleResetToDefaults() {
    const confirmed = await confirmAlert({
      title: "Reset to default categories?",
      message: "This will replace all your custom categories with the default ones. This action cannot be undone.",
      primaryAction: {
        title: "Reset",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await saveCategoriesAndUpdate(DEFAULT_CATEGORIES);
    }
  }

  return (
    <List isLoading={isLoading}>
      <List.Section title="File Categories" subtitle={`${categories.length} categories`}>
        {categories.map((category, index) => (
          <List.Item
            key={index}
            title={category.name}
            subtitle={`${category.extensions.length} extensions`}
            accessories={[
              {
                text:
                  category.extensions.slice(0, 3).join(", ") +
                  (category.extensions.length > 3 ? `, +${category.extensions.length - 3} more` : ""),
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Edit Category"
                  onAction={() =>
                    push(
                      <CategoryForm
                        category={category}
                        onSave={(updatedCategory) => handleEditCategory(index, updatedCategory)}
                      />,
                    )
                  }
                />
                <Action
                  title="Delete Category"
                  style={Action.Style.Destructive}
                  onAction={() => handleDeleteCategory(index)}
                />
                <ActionPanel.Section>
                  <Action title="Add New Category" onAction={() => push(<CategoryForm onSave={handleAddCategory} />)} />
                  <Action title="Reset to Defaults" style={Action.Style.Destructive} onAction={handleResetToDefaults} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {categories.length === 0 && !isLoading && (
        <List.EmptyView
          title="No categories configured"
          description="Add your first file category to get started"
          actions={
            <ActionPanel>
              <Action title="Add Category" onAction={() => push(<CategoryForm onSave={handleAddCategory} />)} />
              <Action title="Load Defaults" onAction={handleResetToDefaults} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
