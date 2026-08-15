import { Form, Action, ActionPanel, showToast, Toast, Icon } from "@raycast/api";
import { BitwardenProvider, useBitwarden } from "~/context/bitwarden";
import RootErrorBoundary from "~/components/RootErrorBoundary";
import { SessionProvider } from "~/context/session";
import { FormValidation, useForm } from "@raycast/utils";
import { DebuggingBugReportingActionSection } from "~/components/actions";

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
      const toast = await showToast({ title: "Creating Folder...", style: Toast.Style.Animated });
      try {
        const { error } = await bitwarden.createFolder(formData.name);
        if (error) throw error;
        toast.style = Toast.Style.Success;
        toast.title = "Folder created";
        toast.message = formData.name;
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create folder";
        toast.message = undefined;
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
          <Action.SubmitForm title="Create Folder" onSubmit={handleSubmit} icon={Icon.NewFolder} />
          <DebuggingBugReportingActionSection />
        </ActionPanel>
      }
    >
      <Form.TextField title="Folder Name" placeholder="eg: Personal, Work" autoFocus {...itemProps.name} />
    </Form>
  );
}

export default CreateFolderCommand;
