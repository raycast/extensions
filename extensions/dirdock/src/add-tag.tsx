import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { addTag, Tag } from "./utils/storage";
import { v4 as uuidv4 } from "uuid";
import { colorEmojiMap } from "./utils/colorEmojiMap"; // Import color-to-emoji map

export default function AddTagCommand() {
  const { handleSubmit, itemProps } = useForm<{
    name: string;
    color: string;
  }>({
    async onSubmit(values) {
      try {
        const newTag: Tag = {
          id: uuidv4(),
          name: values.name,
          color: values.color,
        };
        await addTag(newTag);
        showToast(Toast.Style.Success, "Tag Added", `${newTag.name} has been added.`);
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed to Add Tag", (error as Error).message);
      }
    },
    validation: {
      name: FormValidation.Required,
      color: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Tag" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Tag Name" placeholder="e.g., Work" {...itemProps.name} />
      <Form.Dropdown title="Tag Color" {...itemProps.color}>
        {Object.entries(colorEmojiMap).map(([color, emoji]) => (
          <Form.Dropdown.Item key={color} value={color} title={`${emoji} ${color}`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
