import { Clipboard, showToast, Toast } from "@raycast/api";
import { UploadForm } from "../components/upload-form";
import { useUpload } from "../hooks/use-upload";
import type { UploadOptions } from "../api/interfaces";
import { basename } from "path";

export default function UploadCommand() {
  const { upload, preferences } = useUpload();

  const handleSubmit = async (values: UploadOptions) => {
    if (!values.filePath) {
      await showToast(Toast.Style.Failure, "Please choose a file");
      return;
    }
    const payload: UploadOptions = {
      ...values,
      fileName: values.fileName || basename(Array.isArray(values.filePath) ? values.filePath[0] : values.filePath),
    };
    const url = await upload(payload);
    await Clipboard.copy(url);
    await showToast(Toast.Style.Success, "Uploaded and copied direct link", url);
  };

  return (
    <UploadForm
      initialValues={{
        channel: preferences.uploadChannel ?? "telegram",
        folder: preferences.uploadFolder,
        nameType: preferences.uploadNameType ?? "default",
        returnFormat: preferences.returnFormat ?? "default",
        serverCompress: preferences.serverCompress ?? true,
        autoRetry: preferences.autoRetry ?? true,
      }}
      onSubmit={handleSubmit}
    />
  );
}
