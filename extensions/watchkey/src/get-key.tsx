import { Action, ActionPanel, Form, showToast, Toast, Clipboard, popToRoot } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { watchkeyGet } from "./watchkey";

interface FormValues {
  service: string;
}

export default function GetKey() {
  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit: async (values) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Retrieving secret..." });
      try {
        const value = await watchkeyGet(values.service);
        await Clipboard.copy(value);
        toast.style = Toast.Style.Success;
        toast.title = `Copied "${values.service}" to clipboard`;
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to retrieve secret";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    },
    validation: {
      service: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Get Secret" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Key Name" placeholder="DOPPLER_TOKEN_DEV" {...itemProps.service} />
    </Form>
  );
}
