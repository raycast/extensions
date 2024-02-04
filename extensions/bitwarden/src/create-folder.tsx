import { Form, Action, showHUD, ActionPanel, showToast, Toast, popToRoot } from "@raycast/api";
import { BitwardenProvider, useBitwarden } from "~/context/bitwarden";
import RootErrorBoundary from "~/components/RootErrorBoundary";
import { SessionProvider } from "~/context/session";
import { FormValidation, useForm } from "@raycast/utils";

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

  const { handleSubmit, itemProps } = useForm<FormData>({
    onSubmit: async (formData) => {
      const toast = await showToast({ title: "Creating Folder", style: Toast.Style.Animated });
      try {
        const { error } = await bitwarden.createFolder(formData.name);
        if (error) throw error;
        await showHUD(`${formData.name} folder created`);
        await popToRoot();
      } catch (error) {
        toast.title = "Failed to create folder";
        toast.style = Toast.Style.Failure;
      }
    },
    validation: {
      name: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Folder" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Folder Name" placeholder="eg: Personal, Work" autoFocus={true} {...itemProps.name} />
    </Form>
  );
}

export default CreateFolderCommand;
