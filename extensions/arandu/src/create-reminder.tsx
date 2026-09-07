import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { api } from "./lib/client";

interface Values {
  title: string;
  body: string;
  fireAt: Date | null;
}

export default function CreateReminder() {
  const { handleSubmit, itemProps } = useForm<Values>({
    validation: {
      title: FormValidation.Required,
      fireAt: (value) => {
        if (!value) return "Pick when to be reminded";
        if (value.getTime() < Date.now()) return "Must be in the future";
        return undefined;
      },
    },
    onSubmit: async (values) => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating reminder…",
      });
      try {
        await api.createReminder({
          title: values.title.trim(),
          ...(values.body.trim() ? { body: values.body.trim() } : {}),
          nextFireAt: values.fireAt!.getTime(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Reminder created";
        toast.message = values.title.trim();
        await popToRoot();
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create reminder";
        toast.message = err instanceof Error ? err.message : String(err);
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Reminder" icon={Icon.Bell} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="What should Arandu remind you of?" {...itemProps.title} />
      <Form.TextArea title="Notes" placeholder="Details (optional)" {...itemProps.body} />
      <Form.DatePicker title="When" type={Form.DatePicker.Type.DateTime} {...itemProps.fireAt} />
    </Form>
  );
}
