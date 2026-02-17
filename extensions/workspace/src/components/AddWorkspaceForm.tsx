import { Action, ActionPanel, Form, popToRoot, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import path from "path";

import { getStoredWorkspaces, saveStoredWorkspaces } from "@/utils/storage";

interface AddWorkspaceFormProps {
  onDone?: () => void;
}

interface FormValues {
  workspace: string[];
}

export default function AddWorkspaceForm({ onDone }: AddWorkspaceFormProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const workspacePath = values.workspace[0];
      const workspaces = await getStoredWorkspaces();

      if (workspaces.includes(workspacePath)) {
        await showToast({
          message: path.basename(workspacePath),
          style: Toast.Style.Failure,
          title: "Workspace already added",
        });

        return;
      }

      workspaces.push(workspacePath);

      await saveStoredWorkspaces(workspaces);
      await showToast({
        message: path.basename(workspacePath),
        style: Toast.Style.Success,
        title: "Workspace Added",
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
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Add Workspace" />
        </ActionPanel>
      }
      navigationTitle="Add Workspace"
    >
      <Form.Description
        text="Select a parent folder that contains your workspace projects. You can manage your workspaces later in the extension settings."
        title="Add Workspace"
      />
      <Form.FilePicker
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        title="Workspace Path"
        {...itemProps.workspace}
      />
    </Form>
  );
}
