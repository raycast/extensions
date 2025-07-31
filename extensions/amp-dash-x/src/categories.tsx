import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import React, { useState, useEffect } from "react";
import {
  getCategories,
  saveCategory,
  deleteCategory,
  updateCategory,
} from "./lib/storage";

export default function ManageCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setIsLoading(true);
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to load categories");
      console.error("Load error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteCategory(category: string) {
    if (category === "General") {
      showToast(Toast.Style.Failure, "Cannot delete General category");
      return;
    }

    const options: Alert.Options = {
      title: "Delete Category",
      message: `Are you sure you want to delete "${category}"? All prompts in this category will be moved to "General".`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
        onAction: async () => {
          const success = await deleteCategory(category);
          if (success) {
            showToast(Toast.Style.Success, "Category deleted");
            loadCategories();
          } else {
            showToast(Toast.Style.Failure, "Failed to delete category");
          }
        },
      },
    };

    await confirmAlert(options);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search categories...">
      <List.Item
        title="Add New Category"
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Category"
              target={<AddCategoryForm onSave={loadCategories} />}
              icon={Icon.Plus}
            />
          </ActionPanel>
        }
      />
      {categories.map((category) => (
        <List.Item
          key={category}
          title={category}
          icon={Icon.Folder}
          subtitle={category === "General" ? "Default category" : undefined}
          actions={
            <ActionPanel>
              {category !== "General" && (
                <>
                  <Action.Push
                    title="Edit Category"
                    target={
                      <EditCategoryForm
                        category={category}
                        onSave={loadCategories}
                      />
                    }
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                  />
                  <Action
                    title="Delete Category"
                    onAction={() => handleDeleteCategory(category)}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                </>
              )}
              <Action.Push
                title="Add New Category"
                target={<AddCategoryForm onSave={loadCategories} />}
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

interface CategoryFormProps {
  category?: string;
  onSave: () => void;
}

function AddCategoryForm({ onSave }: Pick<CategoryFormProps, "onSave">) {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string }) {
    if (!values.name.trim()) {
      showToast(Toast.Style.Failure, "Category name is required");
      return;
    }

    setIsLoading(true);

    try {
      const success = await saveCategory(values.name.trim());
      if (success) {
        showToast(Toast.Style.Success, "Category added successfully");
        onSave();
        pop();
      } else {
        showToast(Toast.Style.Failure, "Category already exists");
      }
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to add category");
      console.error("Save error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Category" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.TextField
        id="name"
        title="Category Name"
        placeholder="Enter category name"
        info="Create a new category to organize your prompts"
      />
    </Form>
  );
}

function EditCategoryForm({ category, onSave }: CategoryFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string }) {
    if (!values.name.trim()) {
      showToast(Toast.Style.Failure, "Category name is required");
      return;
    }

    if (values.name.trim() === category) {
      pop();
      return;
    }

    setIsLoading(true);

    try {
      const success = await updateCategory(category!, values.name.trim());
      if (success) {
        showToast(Toast.Style.Success, "Category updated successfully");
        onSave();
        pop();
      } else {
        showToast(Toast.Style.Failure, "Category name already exists");
      }
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to update category");
      console.error("Update error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Category" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.TextField
        id="name"
        title="Category Name"
        defaultValue={category}
        placeholder="Enter category name"
        info="Update the category name (this will update all prompts using this category)"
      />
    </Form>
  );
}
