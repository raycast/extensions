import { Action, ActionPanel, Detail, Form, Icon, showToast, Toast, popToRoot } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { platform } from "node:os";
import { useInstallGuard } from "./install-guard";
import { useUpdateCheck } from "./use-update-check";
import { watchkeyImport } from "./watchkey";

interface FormValues {
  service: string;
}

export default function ImportKey() {
  const { installed, installView } = useInstallGuard();
  useUpdateCheck();

  if (platform() === "win32") {
    return (
      <Detail markdown="# Not Available\n\nImport Key is only available on macOS. It imports existing macOS Keychain items into watchkey." />
    );
  }

  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit: async (values) => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Importing from keychain...",
      });
      try {
        await watchkeyImport(values.service);
        toast.style = Toast.Style.Success;
        toast.title = `Imported "${values.service}"`;
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to import";
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
          <Action.SubmitForm title="Import Key" icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Key Name"
        placeholder="DOPPLER_TOKEN_DEV"
        info="The service name of an existing keychain item to import"
        {...itemProps.service}
      />
    </Form>
  );
}
