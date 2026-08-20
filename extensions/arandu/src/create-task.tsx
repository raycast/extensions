import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { api } from "./lib/client";

interface Values {
  title: string;
  body: string;
  priority: string;
  dueAt: Date | null;
}

export default function CreateTask() {
  const { handleSubmit, itemProps } = useForm<Values>({
    validation: { title: FormValidation.Required },
    initialValues: { priority: "med" },
    onSubmit: async (values) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating task…" });
      try {
        await api.createTask({
          title: values.title.trim(),
          ...(values.body.trim() ? { body: values.body.trim() } : {}),
          priority: values.priority as "low" | "med" | "high" | "urgent",
          ...(values.dueAt ? { dueAt: values.dueAt.getTime() } : {}),
        });
        toast.style = Toast.Style.Success;
        toast.title = "Task created";
        toast.message = values.title.trim();
        await popToRoot();
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create task";
        toast.message = err instanceof Error ? err.message : String(err);
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" icon={Icon.CheckCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="What needs to be done?" {...itemProps.title} />
      <Form.TextArea title="Notes" placeholder="Details (optional)" {...itemProps.body} />
      <Form.Dropdown title="Priority" {...itemProps.priority}>
        <Form.Dropdown.Item value="low" title="Low" />
        <Form.Dropdown.Item value="med" title="Medium" />
        <Form.Dropdown.Item value="high" title="High" />
        <Form.Dropdown.Item value="urgent" title="Urgent" />
      </Form.Dropdown>
      <Form.DatePicker title="Due Date" {...itemProps.dueAt} />
    </Form>
  );
}
