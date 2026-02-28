import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  popToRoot,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useInstallGuard } from "./install-guard";
import { watchkeyDelete } from "./watchkey";

interface FormValues {
  service: string;
}

export default function DeleteKey() {
  const { installed, installView } = useInstallGuard();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit: async (values) => {
      const confirmed = await confirmAlert({
        title: `Delete "${values.service}"?`,
        message: "This cannot be undone.",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      });
      if (!confirmed) return;

      const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting secret..." });
      try {
        await watchkeyDelete(values.service);
        toast.style = Toast.Style.Success;
        toast.title = `Deleted "${values.service}"`;
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to delete secret";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    },
    validation: {
      service: FormValidation.Required,
    },
  });

  if (!installed) return installView;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Delete Secret" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Key Name" placeholder="DOPPLER_TOKEN_DEV" {...itemProps.service} />
    </Form>
  );
}
