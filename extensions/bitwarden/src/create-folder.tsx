import { Form, Action, showHUD, ActionPanel, showToast, Toast } from "@raycast/api";
import { BitwardenProvider, useBitwarden } from "~/context/bitwarden";
import RootErrorBoundary from "~/components/RootErrorBoundary";
import { useState } from "react";
import { SessionProvider } from "./context/session";

const CreateFolderCommand = () => (
  <RootErrorBoundary>
    <BitwardenProvider>
      <SessionProvider unlock>
        <CreateFolderComponent />
      </SessionProvider>
    </BitwardenProvider>
  </RootErrorBoundary>
);

interface FormData {
  name: string;
}

function CreateFolderComponent() {
  const bitwarden = useBitwarden();

  const [nameError, setNameError] = useState<string | undefined>();

  const dropNameErrorIfNeeded = () => {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  };

  const validateName = (name: string | undefined) => {
    if (name?.length === 0) {
      setNameError("Name should't be empty!");
      return false;
    } else {
      dropNameErrorIfNeeded();
      return true;
    }
  };

  const handleCreateFolder = async (formData: FormData) => {
    if (!validateName(formData.name)) return;
    const toast = await showToast({ title: "Creating Folder", style: Toast.Style.Animated });
    try {
      const { error } = await bitwarden.createFolder(formData.name);
      if (error) throw error;
      await showHUD("Folder Created");
    } catch (error) {
      toast.title = "Failed to create folder";
      toast.style = Toast.Style.Failure;
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleCreateFolder} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Folder Name"
        placeholder="eg: Personal, Work"
        autoFocus
        error={nameError}
        onChange={dropNameErrorIfNeeded}
        onBlur={(event) => validateName(event.target.value)}
      />
    </Form>
  );
}

export default CreateFolderCommand;
