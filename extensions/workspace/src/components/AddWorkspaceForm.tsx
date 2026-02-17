import { Form, ActionPanel, Action, showToast, Toast, popToRoot, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import path from "path";
import { getStoredWorkspaces, saveStoredWorkspaces } from "../utils/storage";

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
          style: Toast.Style.Failure,
          title: "Workspace already added",
          message: path.basename(workspacePath),
        });

        return;
      }

      workspaces.push(workspacePath);
      await saveStoredWorkspaces(workspaces);

      await showToast({
        style: Toast.Style.Success,
        title: "Workspace Added",
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
      navigationTitle="Add Workspace"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Workspace" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Add Workspace"
        text="Select a parent folder that contains your workspace projects. You can manage your workspaces later in the extension settings."
      />
      <Form.FilePicker
        title="Workspace Path"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        {...itemProps.workspace}
      />
    </Form>
  );
}
