import { Form, ActionPanel, Action, showToast, Toast, popToRoot } from "@raycast/api";
import { ClickUpClient } from "./utils/clickUpClient";
import { TaskItem } from "./types/tasks.dt";
import preferences from "./utils/preferences";
import { FormValidation, useForm } from "@raycast/utils";

interface FormValues {
  name: string;
  description: string;
  dueDate: Date | null;
  priority: string;
}

export default function QuickCapture() {
  const { itemProps, handleSubmit } = useForm<FormValues>({
    async onSubmit(formValues) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating task...",
      });
      try {
        const res = await ClickUpClient<TaskItem>(`/list/${preferences.listId}/task`, "POST", {
          name: formValues.name,
          ...(formValues?.description && { description: formValues.description }),
          ...(formValues?.dueDate && { due_date: new Date(formValues.dueDate).getTime() }),
          ...(formValues?.priority && { priority: formValues.priority }),
        });

        // Ensure the user sees root search when they re-open Raycast.
        if (res.status != 200) {
          throw new Error(`Failed to fetch with status code: ${res.status}`);
        }

        toast.style = Toast.Style.Success;
        toast.title = "Task created successfully";

        popToRoot();
      } catch (error) {
        toast.title = "Something went wrong";
        toast.message = "Please try again";
        toast.style = Toast.Style.Failure;
      }
    },
    initialValues: {
      priority: "3",
    },
    validation: {
      name: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Buy toothpaste..." {...itemProps.name} />
      <Form.Separator />
      <Form.TextArea title="Description" placeholder="Description" {...itemProps.description} />
      <Form.DatePicker title="Due Date" {...itemProps.dueDate} />
      <Form.Dropdown title="Priority" {...itemProps.priority}>
        <Form.Dropdown.Item value="1" title="Urgent" icon="🔴" />
        <Form.Dropdown.Item value="2" title="High" icon="🟠" />
        <Form.Dropdown.Item value="3" title="Normal" icon="🟡" />
        <Form.Dropdown.Item value="4" title="Low" icon="🟢" />
      </Form.Dropdown>
    </Form>
  );
}
