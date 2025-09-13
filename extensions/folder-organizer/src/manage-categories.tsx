import React, { useState, useEffect } from "react";
import {
  ActionPanel,
  Action,
  List,
  Form,
  showToast,
  Toast,
  Alert,
  confirmAlert,
  useNavigation,
  LocalStorage,
} from "@raycast/api";

interface FileCategory {
  name: string;
  extensions: string[];
}

interface CategoryFormProps {
  category?: FileCategory;
  onSave: (category: FileCategory) => void;
}

const DEFAULT_CATEGORIES: FileCategory[] = [
  {
    name: "★ Pictures",
    extensions: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp", ".heic", ".svg", ".ico"],
  },
  {
    name: "★ Videos",
    extensions: [".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm", ".mpeg", ".3gp", ".ts"],
  },
  {
    name: "★ Audio",
    extensions: [".mp3", ".wav", ".aac", ".ogg", ".flac", ".m4a", ".wma", ".aiff"],
  },
  {
    name: "★ Documents",
    extensions: [
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx",
      ".odt",
      ".ods",
      ".odp",
      ".rtf",
      ".txt",
      ".md",
      ".csv",
      ".tsv",
      ".numbers",
      ".psd",
      ".ai",
      ".xd",
      ".fig",
      ".sketch",
      ".indd",
    ],
  },
  {
    name: "★ Archives",
    extensions: [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz", ".iso", ".dmg"],
  },
  {
    name: "★ Code",
    extensions: [
      ".py",
      ".js",
      ".ts",
      ".tsx",
      ".jsx",
      ".java",
      ".c",
      ".cpp",
      ".h",
      ".hpp",
      ".cs",
      ".go",
      ".rb",
      ".php",
      ".swift",
      ".rs",
      ".sh",
      ".bat",
      ".sql",
      ".json",
      ".xml",
      ".yaml",
      ".yml",
    ],
  },
  {
    name: "★ Executables",
    extensions: [".exe", ".msi", ".apk", ".app", ".bin", ".run", ".pkg", ".deb", ".rpm"],
  },
  {
    name: "★ Fonts",
    extensions: [".ttf", ".otf", ".woff", ".woff2", ".eot"],
  },
];

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
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const storedCategories = await LocalStorage.getItem<string>("file-categories");
      if (storedCategories) {
        setCategories(JSON.parse(storedCategories));
      } else {
        // First time setup - use default categories
        await saveCategories(DEFAULT_CATEGORIES);
        setCategories(DEFAULT_CATEGORIES);
      }
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

  async function saveCategories(newCategories: FileCategory[]) {
    try {
      await LocalStorage.setItem("file-categories", JSON.stringify(newCategories));
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
    await saveCategories(updatedCategories);
  }

  async function handleEditCategory(index: number, category: FileCategory) {
    const updatedCategories = [...categories];
    updatedCategories[index] = category;
    await saveCategories(updatedCategories);
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
      await saveCategories(updatedCategories);
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
      await saveCategories(DEFAULT_CATEGORIES);
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
