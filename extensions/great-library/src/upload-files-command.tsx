import { Action, ActionPanel, Form, LaunchProps } from "@raycast/api";
import { useEffect } from "react";
import { formatBytes } from "./lib/format";
import { useFileUpload } from "./hooks/useFileUpload";

type FormValues = {
  files?: string[];
};

export default function UploadFilesCommand({ launchContext }: LaunchProps) {
  const { files, isUploading, totalSize, handleSelectionChange, uploadFiles, reset } = useFileUpload();

  // Reset state when launch context changes
  useEffect(() => {
    reset();
  }, [launchContext, reset]);

  // Handle form submission
  const handleSubmit = async (values: FormValues) => {
    const selectedPaths = values.files ?? [];
    await uploadFiles(selectedPaths);
  };

  // Helper text for the form
  const helperText =
    files.length > 0
      ? `${files.length} file(s) selected • ${formatBytes(totalSize)} total`
      : "Select files to upload to your Great Library";

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isUploading}
      navigationTitle="Upload Files to Great Library"
    >
      <Form.FilePicker
        id="files"
        title="Files"
        allowMultipleSelection={true}
        canChooseDirectories={false}
        onChange={handleSelectionChange}
        info={helperText}
      />
    </Form>
  );
}
