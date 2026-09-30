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

  async function handleSubmit(values: { items: string[] }) {
    if (!values.items || values.items.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No items selected",
        message: "Please select at least one item to upload",
      });
      return;
    }

    const success = await uploadFiles(values.items, destinationFolder, driveId);
    if (success) {
      onUploadComplete();
      pop();
    }
  }

  return (
    <Form
      navigationTitle="Upload to Current Directory"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload" icon={Icon.Upload} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="items" title="Select Items" allowMultipleSelection canChooseDirectories />
      <Form.Description text={`Items will be uploaded to "${destinationFolder.name}"`} />
    </Form>
  );
}
