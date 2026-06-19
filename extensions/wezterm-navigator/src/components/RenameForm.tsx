import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";

interface RenameFormProps {
  type: "Tab" | "Workspace";
  currentName: string;
  onRename: (newName: string) => Promise<void>;
}

export function RenameForm({ type, currentName, onRename }: RenameFormProps) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();

  async function handleSubmit(values: { name: string }) {
    const newName = values.name.trim();

    if (!newName) {
      setNameError("Name is required");
      return;
    }

    if (newName === currentName) {
      setNameError("Name is unchanged");
      return;
    }

    try {
      await showToast({ style: Toast.Style.Animated, title: `Renaming ${type.toLowerCase()}...` });
      await onRename(newName);
      await showToast({ style: Toast.Style.Success, title: `${type} renamed to "${newName}"` });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to rename ${type.toLowerCase()}`,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      navigationTitle={`Rename ${type}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={`Rename ${type}`} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title={`${type} Name`}
        defaultValue={currentName}
        placeholder={`Enter new ${type.toLowerCase()} name`}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
    </Form>
  );
}
