import { Form, ActionPanel, Action, showToast, getPreferenceValues, Toast } from "@raycast/api";
import { MemClient } from "@mem-labs/mem-node";
import { useForm, FormValidation } from "@raycast/utils";

interface CreateMemValues {
  content: string;
  scheduledFor: Date | null;
  isRead: boolean;
}

export default function Command() {
  const memClient = new MemClient({
    apiAccessToken: getPreferenceValues().apiToken,
  });

  const { handleSubmit, itemProps } = useForm<CreateMemValues>({
    async onSubmit(values) {
      console.log(values);
      showToast({ title: "Creating mem", style: Toast.Style.Animated });
      try {
        await memClient.createMem({
          content: values.content,
          scheduledFor: values.scheduledFor?.toString(),
          isRead: values.isRead,
        });
        showToast({ title: "Succesfully created mem", style: Toast.Style.Success });
      } catch (e: any) {
        showToast({
          title: "Mem API replied with failure",
          message: e.message.toString(),
          style: Toast.Style.Failure,
        });
      }
    },
    validation: {
      content: FormValidation.Required,
      scheduledFor: (date) => {
        if (date && date < new Date()) {
          return "Date must be in the future.";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Create mem" />
        </ActionPanel>
      }
    >
      <Form.TextArea placeholder="Start typing your mem here..." {...itemProps.content} />
      <Form.Separator />
      <Form.DatePicker title="Schedule for later?" {...itemProps.scheduledFor} />
      <Form.Checkbox title="Mark as read?" label="Read" {...itemProps.isRead} />
    </Form>
  );
}
