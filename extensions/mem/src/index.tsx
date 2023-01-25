import { Form, ActionPanel, Action, showToast, getPreferenceValues, Toast, LaunchProps, popToRoot } from "@raycast/api";
import { MemClient } from "@mem-labs/mem-node";
import { useForm, FormValidation } from "@raycast/utils";

interface CreateMemValues {
  content: string;
  scheduledFor: Date | null;
  isRead: boolean;
  isArchived: boolean;
}

export default function Command(props: LaunchProps<{ draftValues: CreateMemValues }>) {
  const { draftValues } = props;
  const memClient = new MemClient({
    apiAccessToken: getPreferenceValues().apiToken,
  });

  const { handleSubmit, itemProps } = useForm<CreateMemValues>({
    async onSubmit(values) {
      showToast({ title: "Creating mem", style: Toast.Style.Animated });
      try {
        await memClient.createMem({
          content: values.content,
          scheduledFor: values.scheduledFor?.toISOString(),
          isRead: values.isRead,
          isArchived: values.isArchived,
        });
        showToast({ title: "Succesfully created mem", style: Toast.Style.Success });
        popToRoot();
      } catch (e: any) {
        showToast({
          title: "Mem API replied with failure",
          message: e.message.toString(),
          style: Toast.Style.Failure,
        });
      }
    },
    initialValues: draftValues,
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
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Create mem" />
        </ActionPanel>
      }
    >
      <Form.TextArea placeholder="Start typing your mem here..." {...itemProps.content} />
      <Form.Separator />
      <Form.DatePicker title="Schedule for Later?" {...itemProps.scheduledFor} />
      <Form.Checkbox title="Mark as Read?" label="Read" {...itemProps.isRead} />
      <Form.Checkbox title="Hide from Inbox?" label="Hide" {...itemProps.isArchived} />
    </Form>
  );
}
