import { Form, ActionPanel, Action, showToast, Toast, popToRoot, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import path from "path";
import { useI18n } from "../hooks/useI18n";

import { getStoredWorkspaces, saveStoredWorkspaces } from "../utils/storage";

interface AddWorkspaceFormProps {
  onDone?: () => void;
}

interface FormValues {
  workspace: string[];
}

export default function AddWorkspaceForm({ onDone }: AddWorkspaceFormProps) {
  const { pop } = useNavigation();
  const { t } = useI18n();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const workspacePath = values.workspace[0];
      const workspaces = await getStoredWorkspaces();

      if (workspaces.includes(workspacePath)) {
        await showToast({
          style: Toast.Style.Failure,
          title: t("addWorkspace.alreadyExists"),
          message: path.basename(workspacePath),
        });

        return;
      }

      workspaces.push(workspacePath);
      await saveStoredWorkspaces(workspaces);

      await showToast({
        style: Toast.Style.Success,
        title: t("addWorkspace.success"),
        message: path.basename(workspacePath),
      });

      if (onDone) {
        onDone();
      } else {
        try {
          pop();
        } catch {
          popToRoot();
        }
      }
    },
    validation: {
      workspace: FormValidation.Required,
    },
  });

  return (
    <Form
      navigationTitle={t("addWorkspace.title")}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("addWorkspace.form.submit")} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title={t("addWorkspace.description.title")} text={t("addWorkspace.description.text")} />
      <Form.FilePicker
        title={t("addWorkspace.form.workspace")}
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        {...itemProps.workspace}
      />
    </Form>
  );
}
