import { Action, ActionPanel, Clipboard, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { uploadFile, EXPIRY_OPTIONS, type ExpiryTime } from "./lib/api";
import { UploadBatchError, uploadFilesBatch } from "./lib/upload-batch";
import { addRecentUpload } from "./lib/storage";

interface FormValues {
  file: string[];
  time: string;
}

function updateSuccessToast(toast: Toast, uploads: { filename: string }[]) {
  toast.style = Toast.Style.Success;

  if (uploads.length === 1) {
    toast.title = uploads[0].filename;
    toast.message = "URL copied to clipboard";
    return;
  }

  toast.title = `${uploads.length} files uploaded`;
  toast.message = "URLs copied to clipboard";
}

function UploadForm() {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: { time: "24h" },
    onSubmit: async (values) => {
      const files = values.file?.filter(Boolean);
      if (!files?.length) {
        await showToast(Toast.Style.Failure, "Please select at least one file");
        return;
      }

      const toast = await showToast(Toast.Style.Animated, `Uploading ${files.length} file(s)...`);

      try {
        const expiry = values.time as ExpiryTime;
        const result = await uploadFilesBatch(files, expiry, {
          uploadFile,
          addRecentUpload,
          copyToClipboard: Clipboard.copy,
        });
        updateSuccessToast(toast, result.uploads);
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;

        if (error instanceof UploadBatchError) {
          if (error.uploads.length > 0) {
            const uploadedCount = error.uploads.length;
            const fileLabel = uploadedCount === 1 ? "file" : "files";
            const clipboardMessage = error.clipboardCopied
              ? "Uploaded URLs copied to clipboard."
              : "Uploaded URLs were not copied.";
            const failureDetails = error.failedFilename
              ? `${error.failedFilename} failed: ${error.message}`
              : (error.clipboardErrorMessage ?? error.message);

            toast.title = `${uploadedCount} of ${error.totalFiles} ${fileLabel} uploaded`;
            toast.message = `${clipboardMessage} ${failureDetails}`;
            return;
          }

          toast.title = "Upload failed";
          toast.message = error.message;
          return;
        }

        toast.title = "Upload failed";
        toast.message = error instanceof Error ? error.message : "Upload failed";
      }
    },
    validation: {
      file: (value) => (!value?.length ? "Select at least one file" : undefined),
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker title="File" {...itemProps.file} allowMultipleSelection />
      <Form.Dropdown title="Expires in" {...itemProps.time}>
        {EXPIRY_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.label} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export default function UploadToLitterbox() {
  return <UploadForm />;
}
