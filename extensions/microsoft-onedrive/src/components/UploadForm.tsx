import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { uploadFiles } from "../api/files";
import type { DriveItem } from "../types";

interface UploadFormProps {
  destinationFolder: DriveItem;
  driveId: string;
  onUploadComplete: () => void;
}

export function UploadForm({ destinationFolder, driveId, onUploadComplete }: UploadFormProps) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { files: string[] }) {
    if (!values.files || values.files.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Files Selected",
        message: "Please select at least one file to upload",
      });
      return;
    }

    const success = await uploadFiles(values.files, destinationFolder, driveId);
    if (success) {
      onUploadComplete();
      pop();
    }
  }

  return (
    <Form
      navigationTitle="Upload to Current Folder"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload" icon={Icon.Upload} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" title="Select Files" allowMultipleSelection={true} canChooseDirectories={false} />
      <Form.Description text={`Files will be uploaded to "${destinationFolder.name}"`} />
    </Form>
  );
}
