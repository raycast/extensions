import { Form, Action, ActionPanel, Icon, openExtensionPreferences } from "@raycast/api";
import GridLoadingView from "./GridLoadingView";
import GridRestoredImages from "./GridRestoredImages";
import PasswordForm from "./PasswordForm";
import { useDecryptImages } from "../hooks/useDecryptImages";
import { FormValidation, useForm } from "@raycast/utils";

function DecryptImagesForm() {
  const { isLoading, data, selectedFiles, handleDecrypt, handleFormSubmit } = useDecryptImages();
  const { handleSubmit, itemProps } = useForm<{ folders: string[] }>({
    onSubmit: handleFormSubmit,
    validation: {
      folders: FormValidation.Required,
    },
  });

  // Loading
  if (isLoading) {
    return <GridLoadingView />;
  }

  // Password form
  if (selectedFiles.manifest?.secure && !data) {
    return (
      <PasswordForm
        actionTitle="Decrypt"
        onSubmit={(secretKey) =>
          handleDecrypt(selectedFiles.manifest, selectedFiles.imagePaths, selectedFiles.workdir, secretKey)
        }
      />
    );
  }

  // Restored images grid
  if (data) {
    return <GridRestoredImages manifest={data.manifest} imageBuffers={data.imageBuffers} workdir={data.workdir} />;
  }

  // Default view
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Terminal} title="Decrypt" onSubmit={handleSubmit} />
          <Action icon={Icon.Gear} title="Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.Description title="How to use" text={"Please select the manifest file and the encrypted images."} />
      <Form.FilePicker allowMultipleSelection={true} canChooseFiles={true} {...itemProps.folders} />
    </Form>
  );
}

export default DecryptImagesForm;
