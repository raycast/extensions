import { useRef, useState } from "react";
import { Action, ActionPanel, Clipboard, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { uploadFile, EXPIRY_OPTIONS, type ExpiryTime } from "../lib/api";
import { UploadBatchError, uploadFilesBatch } from "../lib/upload-batch";
import { addRecentUpload } from "../lib/storage";

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

export default function UploadForm({ initialFiles = [] }: { initialFiles?: string[] }) {
  const submitting = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  const { handleSubmit, itemProps, setValue } = useForm<FormValues>({
    initialValues: { file: initialFiles, time: "24h" },
    onSubmit: async (values) => {
      const files = values.file?.filter(Boolean);
      if (!files?.length) {
        await showToast(Toast.Style.Failure, "Please select at least one file");
        return;
      }

      if (submitting.current) return;
      submitting.current = true;
      setIsLoading(true);
      let toast: Toast | undefined;

      try {
        toast = await showToast(Toast.Style.Animated, `Uploading ${files.length} file(s)...`);
        const expiry = values.time as ExpiryTime;
        const result = await uploadFilesBatch(files, expiry, {
          uploadFile,
          addRecentUpload,
          copyToClipboard: Clipboard.copy,
        });
        updateSuccessToast(toast, result.uploads);
        pop();
      } catch (error) {
        // Toast creation can fail too; always release the guard in finally.
        if (!toast) throw error;
        toast.style = Toast.Style.Failure;

        if (error instanceof UploadBatchError) {
          if (error.uploads.length > 0) {
            const uploadedCount = error.uploads.length;
            const fileLabel = error.totalFiles === 1 ? "file" : "files";
            // Uploads are sequential, but the picker may have changed while
            // they ran. Remove successful paths without replacing newer edits.
            const uploadedPaths = new Set(files.slice(0, uploadedCount));
            setValue("file", (currentFiles) => currentFiles.filter((file) => !uploadedPaths.has(file)));
            const clipboardMessage = error.clipboardCopied
              ? "Uploaded URLs copied to clipboard."
              : "Uploaded URLs were not copied.";
            const failureDetails = error.failedFilename
              ? `${error.failedFilename} failed: ${error.message}`
              : (error.clipboardErrorMessage ?? error.message);

            toast.title = `${uploadedCount} of ${error.totalFiles} ${fileLabel} uploaded`;
            const historyMessage = error.historyErrorMessage
              ? ` History could not be saved: ${error.historyErrorMessage}.`
              : " See View Recent Uploads for successful links.";
            toast.message = `${clipboardMessage} ${failureDetails}${historyMessage}`;
            return;
          }

          toast.title = "Upload failed";
          toast.message = error.message;
          return;
        }

        toast.title = "Upload failed";
        toast.message = error instanceof Error ? error.message : "Upload failed";
      } finally {
        submitting.current = false;
        setIsLoading(false);
      }
    },
    validation: {
      file: (value) => (!value?.length ? "Select at least one file" : undefined),
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Review the files and expiry, then choose Upload. Each file must be at most 1 GB. All files are checked before any upload starts." />
      <Form.FilePicker title="Files" {...itemProps.file} allowMultipleSelection canChooseDirectories={false} />
      <Form.Dropdown title="Expires in" {...itemProps.time}>
        {EXPIRY_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.label} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
