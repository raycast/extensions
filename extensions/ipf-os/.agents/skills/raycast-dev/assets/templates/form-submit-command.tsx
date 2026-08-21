import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";

interface CreateItemValues {
  title: string;
  description: string;
  priority: string;
  isUrgent: boolean;
  dueDate: Date | null;
}

export default function Command() {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<CreateItemValues>({
    onSubmit: async (values) => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Submitting item...",
      });

      try {
        // Replace with actual API call
        console.log("Form values:", values);

        toast.style = Toast.Style.Success;
        toast.title = "Item created successfully";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create item";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    },
    validation: {
      title: FormValidation.Required,
      description: (value) => {
        if (!value || value.trim().length < 5) {
          return "Description must be at least 5 characters";
        }
      },
      priority: FormValidation.Required,
    },
    initialValues: {
      title: "",
      description: "",
      priority: "medium",
      isUrgent: false,
      dueDate: null,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Item" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Title"
        placeholder="Brief summary of item"
        {...itemProps.title}
      />
      <Form.TextArea
        title="Description"
        placeholder="Detailed context and next steps..."
        {...itemProps.description}
      />
      <Form.Dropdown title="Priority" {...itemProps.priority}>
        <Form.Dropdown.Item title="Low" value="low" />
        <Form.Dropdown.Item title="Medium" value="medium" />
        <Form.Dropdown.Item title="High" value="high" />
      </Form.Dropdown>
      <Form.Checkbox
        label="Mark as urgent"
        title="Urgency"
        {...itemProps.isUrgent}
      />
      <Form.DatePicker
        title="Due Date"
        type={Form.DatePicker.Type.Date}
        {...itemProps.dueDate}
      />
    </Form>
  );
}
