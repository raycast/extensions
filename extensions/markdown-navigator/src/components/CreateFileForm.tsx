// src/components/CreateFileForm.tsx
import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon, Color } from "@raycast/api";
import { useState } from "react";
import createMarkdown from "../utils/createMarkdown";
import path from "path";
import { homedir } from "os";
import { SYSTEM_TAGS } from "../types/markdownTypes";
import { showFailureToast } from "@raycast/utils";
import { clearMarkdownFilesCache } from "../utils/fileOperations";

interface CreateFileFormProps {
  rootDirectory: string;
  currentFolder?: string;
  onFileCreated: () => void;
}

export function CreateFileForm({ rootDirectory, currentFolder, onFileCreated }: CreateFileFormProps) {
  const { pop } = useNavigation();
  const [isCreating, setIsCreating] = useState(false);

  // Calculate target path - use desktop as fallback
  const baseDir = rootDirectory || path.join(homedir(), "Desktop");
  const targetPath = currentFolder ? path.join(baseDir, currentFolder) : baseDir;

  const handleSubmit = async (values: {
    title: string;
    template: string;
    systemTags: string[];
    customTags: string;
  }) => {
    if (!values.title) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Title is required",
      });
      return;
    }

    setIsCreating(true);

    try {
      // Display the path where the archive will be created

      await showToast({
        style: Toast.Style.Animated,
        title: "Creating file...",
        message: `Path: ${targetPath}`,
      });

      // Process system tags
      const systemTags = values.systemTags || [];

      // Process custom tags
      const customTagsList = values.customTags
        ? values.customTags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];

      // Combine all tags
      const allTags = [...systemTags, ...customTagsList];

      // Create a Markdown file and open it with Typora
      const result = await createMarkdown({
        title: values.title,
        template: values.template,
        tags: allTags,
        targetPath,
      });

      if (result.filePath) {
        // Clear the cache first to ensure fresh data
        await clearMarkdownFilesCache();

        // Trigger revalidation immediately
        onFileCreated();

        // Show a success toast that indicates refresh is happening
        await showToast({
          style: Toast.Style.Success,
          title: "File created successfully",
          message: "Refreshing file list...",
        });

        // Pop back to the main screen
        pop();
      }
    } catch (error) {
      showFailureToast({
        title: "Failed to create file",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Form
      isLoading={isCreating}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create File" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Enter file title" />

      <Form.Dropdown id="template" title="Template" defaultValue="basic">
        <Form.Dropdown.Item value="basic" title="Basic Note" />
        <Form.Dropdown.Item value="meeting" title="Meeting Notes" />
        <Form.Dropdown.Item value="blog" title="Blog Post" />
        <Form.Dropdown.Item value="project" title="Project Plan" />
        <Form.Dropdown.Item value="empty" title="Empty File" />
      </Form.Dropdown>

      <Form.TagPicker id="systemTags" title="System Tags">
        {SYSTEM_TAGS.map((tag) => (
          <Form.TagPicker.Item
            key={tag.id}
            value={tag.id}
            title={tag.label}
            icon={{ source: Icon.Circle, tintColor: getTagColor(tag.color) }}
          />
        ))}
      </Form.TagPicker>

      <Form.TextField id="customTags" title="Custom Tags" placeholder="tag1, tag2, tag3" />

      <Form.Description title="Save Location" text={currentFolder || "Root Directory"} />
    </Form>
  );
}

// Helper function to get tag color
function getTagColor(color: string): Color {
  switch (color.toLowerCase()) {
    case "red":
      return Color.Red;
    case "yellow":
      return Color.Yellow;
    case "green":
      return Color.Green;
    case "orange":
      return Color.Orange;
    case "blue":
      return Color.Blue;
    default:
      return Color.PrimaryText;
  }
}
