import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";

import { installFx } from "./components/fx-error-actions";
import { defaultWorkingDirectory, getFxPreferences, isFxNotInstalled, launchInTerminal } from "./lib/fx";

type FormValues = {
  workspace: string[];
  mode: string;
};

export default function Command() {
  const { fxPath, defaultWorkspace } = getFxPreferences();
  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      workspace: defaultWorkspace ? [defaultWorkspace] : [],
      mode: "new",
    },
    validation: { workspace: FormValidation.Required },
    async onSubmit(values) {
      const workspace = defaultWorkingDirectory(values.workspace[0]);
      const args = values.mode === "new" ? [] : values.mode === "resume-last" ? ["resume", "last"] : ["-r"];
      try {
        await launchInTerminal(fxPath, args, workspace);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could Not Open fx",
          message: error instanceof Error ? error.message : String(error),
          primaryAction: isFxNotInstalled(error) ? { title: "Install Fx", onAction: installFx } : undefined,
        });
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Open Fx in Terminal" icon={Icon.Terminal} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        title="Workspace"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
        {...itemProps.workspace}
      />
      <Form.Dropdown title="Session" {...itemProps.mode}>
        <Form.Dropdown.Item value="new" title="Start New Session" icon={Icon.Plus} />
        <Form.Dropdown.Item value="resume-last" title="Resume Latest Session" icon={Icon.ArrowClockwise} />
        <Form.Dropdown.Item value="picker" title="Open Session Picker" icon={Icon.List} />
      </Form.Dropdown>
    </Form>
  );
}
