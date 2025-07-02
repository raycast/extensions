import { List, ActionPanel, Action, LocalStorage, showToast, Toast, Form, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { ensureAllCategoryFolders } from "./utils/folders";
import { Category, CategoryType } from "./types/category";
import path from "path";
import fs from "fs";
import { getPreferenceValues } from "@raycast/api";

function EditCategoryForm({ category, onEdit }: { category: Category; onEdit: (updatedCategory: Category) => void }) {
  const [selectedType, setSelectedType] = useState<CategoryType>(category.type);

  async function handleSubmit(values: {
    name: string;
    imagePath: string[];
    defaultAppPath: string[];
    type: CategoryType;
    command?: string;
    templatePath?: string[];
    folderName: string;
    autoCreateRepo?: boolean;
    setupCommand?: string;
  }) {
    const updatedCategory: Category = {
      name: values.name,
      imagePath: values.imagePath[0] || category.imagePath,
      defaultAppPath: values.defaultAppPath[0] || category.defaultAppPath,
      type: values.type,
      ...(values.command && { command: values.command }),
      ...(values.templatePath && { templatePath: values.templatePath[0] }),
      folderName: values.folderName || category.folderName,
      ...(values.autoCreateRepo && { autoCreateRepo: values.autoCreateRepo }),
      ...(values.setupCommand && { setupCommand: values.setupCommand }),
    };
    onEdit(updatedCategory);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Category Name" defaultValue={category.name} />
      <Form.TextField id="folderName" title="Category Folder Name" defaultValue={category.folderName} />
      <Form.Dropdown
        id="type"
        title="Category Type"
        defaultValue={category.type}
        onChange={(newValue) => setSelectedType(newValue as CategoryType)}
      >
        <Form.Dropdown.Item value="command" title="Run a Command" icon="⌘" />
        <Form.Dropdown.Item value="template" title="Use a Template" icon="📄" />
      </Form.Dropdown>
      {selectedType === "command" && <Form.TextField id="command" title="Command" defaultValue={category.command} />}
      {selectedType === "template" && (
        <Form.FilePicker
          id="templatePath"
          title="Template Path"
          canChooseDirectories
          canChooseFiles={false}
          defaultValue={category.templatePath ? [category.templatePath] : []}
          info="Select a template folder for the category"
        />
      )}
      <Form.FilePicker
        id="imagePath"
        title="Category Image"
        defaultValue={category.imagePath ? [category.imagePath] : []}
        info="Select an image file for the category"
      />
      <Form.FilePicker
        id="defaultAppPath"
        title="Default Application"
        defaultValue={category.defaultAppPath ? [category.defaultAppPath] : []}
        info="Select the default application for this category"
      />
      <Form.Checkbox
        id="autoCreateRepo"
        label="Auto Create Repository"
        defaultValue={category.autoCreateRepo}
        info="Automatically create a repository for the category"
      />
      <Form.TextField id="setupCommand" title="Setup Command" defaultValue={category.setupCommand} />
    </Form>
  );
}

export default function Command() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const storedCategories = await LocalStorage.getItem("categories");
      if (storedCategories) {
        const parsedCategories = JSON.parse(storedCategories as string);
        setCategories(parsedCategories);
        await ensureAllCategoryFolders(parsedCategories);
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
      showToast({
        title: "Error Loading Categories",
        message: "Failed to load or create category folders",
        style: Toast.Style.Failure,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function resetCategories() {
    try {
      await LocalStorage.setItem("categories", "[]");
      setCategories([]);
      showToast({ title: "Categories Reset", message: "All categories have been cleared" });
    } catch (error) {
      showToast({ title: "Error", message: "Failed to reset categories" });
    }
  }

  async function handleEditCategory(oldCategory: Category, updatedCategory: Category) {
    try {
      const updatedCategories = categories.map((cat) => (cat.name === oldCategory.name ? updatedCategory : cat));
      await LocalStorage.setItem("categories", JSON.stringify(updatedCategories));
      setCategories(updatedCategories);
      await ensureAllCategoryFolders(updatedCategories);
      showToast({ title: "Category Updated", message: "Changes have been saved" });
    } catch (error) {
      showToast({
        title: "Error Updating Category",
        message: "Failed to save changes",
        style: Toast.Style.Failure,
      });
    }
  }

  async function handleDeleteCategory(category: Category) {
    try {
      const preferences = getPreferenceValues<{ projectsFolder: string }>();
      const categoryPath = path.join(preferences.projectsFolder, category.name);

      // Delete the category folder
      if (fs.existsSync(categoryPath)) {
        fs.rmSync(categoryPath, { recursive: true, force: true });
      }

      // Update categories in storage
      const updatedCategories = categories.filter((cat) => cat.name !== category.name);
      await LocalStorage.setItem("categories", JSON.stringify(updatedCategories));
      setCategories(updatedCategories);

      showToast({ title: "Category Deleted", message: `${category.name} has been removed` });
    } catch (error) {
      showToast({
        title: "Error Deleting Category",
        message: "Failed to delete category",
        style: Toast.Style.Failure,
      });
    }
  }

  function getCategoryFolderCount(categoryName: string): number {
    try {
      const preferences = getPreferenceValues<{ projectsFolder: string }>();
      const categoryPath = path.join(preferences.projectsFolder, categoryName);

      if (!fs.existsSync(categoryPath)) {
        return 0;
      }

      return fs.readdirSync(categoryPath, { withFileTypes: true }).filter((dirent) => dirent.isDirectory()).length;
    } catch (error) {
      console.error(`Error counting folders for ${categoryName}:`, error);
      return 0;
    }
  }

  return (
    <List isLoading={isLoading}>
      {categories.map((category, index) => (
        <List.Item
          key={index}
          title={category.name}
          icon={category.imagePath}
          accessories={[{ icon: Icon.Folder, text: `${getCategoryFolderCount(category.name)} project(s)` }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Category"
                target={
                  <EditCategoryForm category={category} onEdit={(updated) => handleEditCategory(category, updated)} />
                }
              />
              <Action.Open title="Open in Default App" target={category.defaultAppPath} />
              <Action
                title="Delete Category"
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "delete" }}
                onAction={() => handleDeleteCategory(category)}
              />
              <Action title="Reset Categories" onAction={resetCategories} shortcut={{ modifiers: ["cmd"], key: "r" }} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
