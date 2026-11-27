import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { installPackage } from "../choco/cli";
import { runPackageTask } from "./PackageActions";

interface InstallVersionFormProps {
  packageId: string;
  suggestedVersion?: string;
  onSuccess: () => void;
}

interface InstallVersionValues {
  version: string;
  openInTerminal: boolean;
}

export function InstallVersionForm({
  packageId,
  suggestedVersion,
  onSuccess,
}: InstallVersionFormProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<InstallVersionValues>({
    initialValues: {
      version: suggestedVersion ?? "",
      openInTerminal: false,
    },
    validation: {
      version: FormValidation.Required,
    },
    async onSubmit(values) {
      const trimmed = values.version.trim();
      const status = await runPackageTask({
        loadingTitle: `Installing ${packageId} (${trimmed})...`,
        successTitle: `Installed ${packageId} ${trimmed}`,
        errorTitle: `Failed to install ${packageId}`,
        task: () =>
          installPackage(packageId, {
            version: trimmed,
            forceTerminal: values.openInTerminal,
          }),
      });

      if (status === "completed") {
        onSuccess();
        pop();
      } else if (status === "launched") {
        pop();
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Install Version"
            icon={Icon.Download}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Package" text={packageId} />
      <Form.TextField
        title="Version"
        placeholder="e.g. 2.56.1"
        {...itemProps.version}
      />
      <Form.Checkbox
        label="Open in elevated terminal window"
        {...itemProps.openInTerminal}
      />
    </Form>
  );
}
