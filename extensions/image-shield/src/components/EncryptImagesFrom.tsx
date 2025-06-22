import { Form, Action, ActionPanel } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { SettingsFromValues } from "./SettingsFrom";
import { useEncryptImages } from "../hooks/useEncryptImages";
import GridLoadingView from "./GridLoadingView";
import GridEncryptedImages from "./GridEncryptedImages";
import PasswordForm from "./PasswordForm";

export interface EncryptImagesFromValues {
  folders: string[];
  encrypted: boolean;
  outputDir: string[];
}

function EncryptImagesFrom({ settings }: { settings: SettingsFromValues }) {
  const { isLoading, data, selectedFiles, handleEncrypt, handleFormSubmit } = useEncryptImages(settings);
  const { handleSubmit, itemProps } = useForm<EncryptImagesFromValues>({
    initialValues: {
      folders: [],
      encrypted: settings.encrypted,
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
          <Action.SubmitForm title="Encrypt" onSubmit={handleSubmit} />
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

export default EncryptImagesFrom;
