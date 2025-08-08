import { Form, ActionPanel, Action, showToast, LocalStorage, Toast } from "@raycast/api";
import { createCategoryFolder, ensureAllCategoryFolders } from "./utils/folders";

export default function Command() {
  async function handleSubmit({
    name,
    folderName,
    defaultAppPath,
    imagePath,
    autoCreateRepo,
  }: {
    name: string;
    folderName: string;
    defaultAppPath: string;
    imagePath: string;
    autoCreateRepo: boolean;
  }) {
    try {
      // Create folder for the new category
      await createCategoryFolder(name);

      // Get existing categories or initialize empty array
      const existingCategories = JSON.parse((await LocalStorage.getItem("categories")) || "[]");

      // Create folders for any existing categories that might be missing folders
      await ensureAllCategoryFolders(existingCategories);

      // Add new category
      const updatedCategories = [
        ...existingCategories,
        { name, folderName, defaultAppPath, imagePath, autoCreateRepo },
      ];

      // Save back to storage
      await LocalStorage.setItem("categories", JSON.stringify(updatedCategories));

      showToast({ title: "Category Created", message: "New category has been saved" });
    } catch (error) {
      showToast({
        title: "Error Creating Category",
        message: "Failed to save category",
        style: Toast.Style.Failure,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new category by filling out the details below." />
      <Form.TextField id="name" title="Category Name" placeholder="Enter category name" autoFocus />
      <Form.TextField id="folderName" title="Folder Name" placeholder="Enter folder name" />

      <Form.FilePicker
        id="imagePath"
        title="Category Image"
        allowMultipleSelection={false}
        info="Select an image file for the category"
      />
      <Form.FilePicker
        id="defaultAppPath"
        title="Default Application"
        allowMultipleSelection={false}
        info="Select the default application for this category"
      />
      <Form.Checkbox
        id="autoCreateRepo"
        label="Auto Create Repository"
        info="Automatically create a repository for the category"
      />
    </Form>
  );
}
