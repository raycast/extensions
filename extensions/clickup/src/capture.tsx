import { Form, ActionPanel, Action, showToast, Toast, popToRoot, Icon, Color, getPreferenceValues } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { getClickUpClient } from "./api/clickup";

interface FormValues {
  name: string;
  description: string;
  dueDate: Date | null;
  priority: string;
  status: string;
}

export default function QuickCapture() {
  const { listId } = getPreferenceValues<Preferences>();

  const { isLoading, data: list } = useCachedPromise(async (id: string) => getClickUpClient().getList(id), [listId]);

  const { itemProps, handleSubmit } = useForm<FormValues>({
    async onSubmit(formValues) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating task...",
      });
      try {
        await getClickUpClient().createTask(listId, {
          name: formValues.name,
          ...(formValues.description && { description: formValues.description }),
          ...(formValues.dueDate && { due_date: new Date(formValues.dueDate).getTime() }),
          ...(formValues.priority && { priority: parseInt(formValues.priority, 10) }),
          ...(formValues.status && { status: formValues.status }),
        });

        toast.style = Toast.Style.Success;
        toast.title = "Task created successfully";

        popToRoot();
      } catch {
        toast.title = "Something went wrong";
        toast.message = "Please try again";
        toast.style = Toast.Style.Failure;
      }
    },
    validation: {
      name: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
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
      <Form.Dropdown title="Priority" {...itemProps.priority} storeValue>
        <Form.Dropdown.Item value="" title="None" icon={Icon.Flag} />
        <Form.Dropdown.Item value="1" title="Urgent" icon={{ source: Icon.Flag, tintColor: Color.Red }} />
        <Form.Dropdown.Item value="2" title="High" icon={{ source: Icon.Flag, tintColor: Color.Yellow }} />
        <Form.Dropdown.Item value="3" title="Normal" icon={{ source: Icon.Flag, tintColor: Color.Blue }} />
        <Form.Dropdown.Item value="4" title="Low" icon={{ source: Icon.Flag, tintColor: Color.SecondaryText }} />
      </Form.Dropdown>
      <Form.Dropdown title="Status" storeValue {...itemProps.status}>
        {list?.statuses?.map((status) => (
          <Form.Dropdown.Item
            key={status.status}
            icon={{ source: Icon.CircleFilled, tintColor: status.color }}
            title={status.status.toUpperCase()}
            value={status.status}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
