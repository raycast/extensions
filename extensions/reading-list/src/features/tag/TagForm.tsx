import { Action, ActionPanel, Form } from "@raycast/api";
import { COLORS } from "./colors";

interface TagFormProps {
  onSubmit: (values: { name: string; color: string }) => void;
  onCancel: () => void;
  initialValues?: {
    name: string;
    color: string;
  };
  submitTitle?: string;
  isLoading?: boolean;
}

export function TagForm({ onSubmit, onCancel, initialValues, submitTitle = "Save", isLoading = false }: TagFormProps) {
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} onSubmit={onSubmit} />
          <Action title="Cancel" onAction={onCancel} shortcut={{ modifiers: ["cmd"], key: "." }} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Tag Name"
        defaultValue={initialValues?.name}
        info="Only alphanumeric characters and hyphens are allowed (max 10 characters)"
        placeholder="Enter tag name"
        error={
          initialValues?.name
            ? initialValues.name.length > 10
              ? "Tag name must be 10 characters or less"
              : !/^[a-zA-Z0-9-]+$/.test(initialValues.name)
                ? "Only alphanumeric characters and hyphens are allowed"
                : undefined
            : undefined
        }
      />
      <Form.Dropdown id="color" title="Color" defaultValue={initialValues?.color || COLORS[0].value}>
        {COLORS.map((color) => (
          <Form.Dropdown.Item
            key={color.value}
            value={color.value}
            title={color.name}
            icon={{ source: color.icon, tintColor: color.value }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
