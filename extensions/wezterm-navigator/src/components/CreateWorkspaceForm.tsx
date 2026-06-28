import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";

interface CreateWorkspaceFormProps {
  onCreate: (name: string, cwd?: string) => Promise<void>;
}

export function CreateWorkspaceForm({ onCreate }: CreateWorkspaceFormProps) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();

  async function handleSubmit(values: { name: string; cwd: string[] }) {
    const name = values.name.trim();

    if (!name) {
      setNameError("Workspace name is required");
      return;
    }

    const cwd = values.cwd?.[0]?.trim() || undefined;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Creating workspace..." });
      await onCreate(name, cwd);
      await showToast({ style: Toast.Style.Success, title: `Workspace "${name}" created` });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create workspace",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      navigationTitle="Create Workspace"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Workspace" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Workspace Name"
        placeholder="Enter workspace name"
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.FilePicker
        id="cwd"
        title="Working Directory"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
      />
    </Form>
  );
}
