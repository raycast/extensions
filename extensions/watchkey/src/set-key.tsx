import { Action, ActionPanel, Form, showToast, Toast, popToRoot } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { watchkeySet } from "./watchkey";

interface FormValues {
  service: string;
  value: string;
}

export default function SetKey() {
  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit: async (values) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Storing secret..." });
      try {
        await watchkeySet(values.service, values.value);
        toast.style = Toast.Style.Success;
        toast.title = `Stored "${values.service}"`;
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to store secret";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    },
    validation: {
      service: FormValidation.Required,
      value: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Store Secret" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Key Name" placeholder="DOPPLER_TOKEN_DEV" {...itemProps.service} />
      <Form.PasswordField title="Secret Value" placeholder="Enter secret" {...itemProps.value} />
    </Form>
  );
}
