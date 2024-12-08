import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { updateTag, Tag } from "./utils/storage";
import { colorEmojiMap } from "./utils/colorEmojiMap"; // Import dynamic color options

interface EditTagProps {
  tag: Tag; // The tag to edit
  onEdit: () => void; // Callback to refresh parent UI after editing
}

export function EditTagCommand({ tag, onEdit }: EditTagProps) {
  const { handleSubmit, itemProps } = useForm<{
    name: string;
    color: string;
  }>({
    // Handle form submission
    async onSubmit(values) {
      try {
        const updatedTag: Tag = {
          ...tag,
          name: values.name, // Updated tag name
          color: values.color, // Updated tag color
        };

        await updateTag(updatedTag); // Save updated tag
        showToast(Toast.Style.Success, "Tag Updated", `${updatedTag.name} has been updated.`);
        onEdit(); // Trigger callback to refresh UI
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed to Update Tag", (error as Error).message);
      }
    },
    // Pre-fill form fields with current tag values
    initialValues: {
      name: tag.name,
      color: tag.color,
    },
    validation: {
      name: FormValidation.Required, // Tag name is required
      color: FormValidation.Required, // Tag color is required
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Tag" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {/* Input field for editing tag name */}
      <Form.TextField title="Tag Name" placeholder="e.g., Work" {...itemProps.name} />

      {/* Dropdown for selecting tag color */}
      <Form.Dropdown title="Tag Color" {...itemProps.color}>
        {Object.entries(colorEmojiMap).map(([hex, emoji]) => (
          <Form.Dropdown.Item
            key={hex}
            value={hex}
            title={`${emoji} ${hex}`} // Display emoji and hex code
            icon={{ source: Icon.Circle, tintColor: hex }} // Add a visual color indicator
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
