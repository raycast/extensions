import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { useState } from "react";

interface FolderFormProps {
  onSubmit: (name: string) => void;
}

export function FolderForm({ onSubmit }: FolderFormProps) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [name, setName] = useState("");

  const validateName = (name?: string) => {
    if (!name || name.trim() === "") {
      setNameError("The name is required");
      return false;
    }
    setNameError(undefined);
    return true;
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Folder"
            onSubmit={async () => {
              if (!validateName(name)) {
                return;
              }
              onSubmit(name.trim());
              await pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new folder to organize your collections" />
      <Form.TextField
        id="name"
        title="Folder name"
        placeholder="eg. Work"
        value={name}
        autoFocus
        error={nameError}
        onChange={(newValue) => {
          setName(newValue);
          if (nameError) {
            validateName(newValue);
          }
        }}
        onBlur={() => validateName(name)}
      />
    </Form>
  );
}
