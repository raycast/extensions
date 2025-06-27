import { Form, Action, ActionPanel, Icon, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEncryptImages } from "../hooks/useEncryptImages";
import GridLoadingView from "./GridLoadingView";
import GridEncryptedImages from "./GridEncryptedImages";
import PasswordForm from "./PasswordForm";

export interface EncryptImagesFormValues {
  folders: string[];
  encrypted: boolean;
  outputDir: string[];
}

function EncryptImagesForm() {
  const preferences = getPreferenceValues<Preferences>();
  const { isLoading, data, selectedFiles, handleEncrypt, handleFormSubmit } = useEncryptImages(preferences);
  const { handleSubmit, itemProps } = useForm<EncryptImagesFormValues>({
    initialValues: {
      folders: [],
      encrypted: preferences.encrypted,
      outputDir: [],
    },
    onSubmit: handleFormSubmit,
    validation: {
      folders: FormValidation.Required,
      encrypted: FormValidation.Required,
    },
  });

  // Loading
  if (isLoading) {
    return <GridLoadingView />;
  }

  // Password form
  if (selectedFiles.config?.encrypted && !data) {
    return (
      <PasswordForm
        actionTitle="Encrypt"
        onSubmit={(secretKey) => handleEncrypt(selectedFiles.imagePaths, selectedFiles.workdir, secretKey)}
      />
    );
  }

  // Encrypted images grid
  if (data) {
    return <GridEncryptedImages manifest={data.manifest} imageBuffers={data.imageBuffers} workdir={data.workdir} />;
  }

  // Default view
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Terminal} title="Encrypt" onSubmit={handleSubmit} />
          <Action icon={Icon.Gear} title="Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.Description title="How to use" text={"Please select the images to encrypt."} />
      <Form.FilePicker
        title="Images"
        allowMultipleSelection={true}
        canChooseFiles={true}
        {...itemProps.folders}
        info="Select images to encrypt."
      />
      <Form.Checkbox
        title="Protection"
        label="Password"
        {...itemProps.encrypted}
        info={`Default: true\nIf disabled, images are only shuffled without password protection. If enabled, images require password for decryption.`}
      />
      <Form.FilePicker
        title="Output Directory"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        {...itemProps.outputDir}
        info={`Default: Downloads/{UUID}`}
      />
    </Form>
  );
}

export default EncryptImagesForm;
