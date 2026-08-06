import { useState } from "react";
import { Action, ActionPanel, Clipboard, Form, showToast, Toast } from "@raycast/api";
import { deleteUpload, uploadFile, uploadFromUrl } from "./lib/cdnClient";
import { addUpload, removeUpload } from "./lib/uploadHistory";
import { getApiToken } from "./lib/preferences";
import { useApiToken } from "./hooks/useApiToken";
import { resolveUploadFileInput } from "./lib/uploadFileInput";
import { CdnApiError } from "./lib/types";
import SetupRequired from "./components/SetupRequired";

export default function Command() {
  const [pathText, setPathText] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const token = useApiToken();

  if (!token) {
    return <SetupRequired />;
  }

  async function handleSubmit() {
    const token = getApiToken();
    const resolution = resolveUploadFileInput(files[0], pathText);

    if (resolution.kind === "empty") {
      await showToast({ style: Toast.Style.Failure, title: "Choose a file or enter a path" });
      return;
    }

    if (resolution.kind === "already-cdn-link") {
      await showToast({
        style: Toast.Style.Failure,
        title: "This is already a Hack Club CDN link. No need to upload it again.",
      });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Uploading…" });

    try {
      const record =
        resolution.kind === "url"
          ? await uploadFromUrl(resolution.url, token)
          : await uploadFile(resolution.path, token);
      await addUpload(record);
      await Clipboard.copy(record.url);

      setFiles([]);
      setPathText("");

      toast.style = Toast.Style.Success;
      toast.title = "Uploaded! Link copied";
      toast.primaryAction = {
        title: "Undo (Delete from CDN)",
        onAction: async (activeToast) => {
          try {
            await deleteUpload(record.id, token);
            await removeUpload(record.id);
            activeToast.style = Toast.Style.Success;
            activeToast.title = "Upload undone";
            activeToast.primaryAction = undefined;
          } catch (error) {
            activeToast.style = Toast.Style.Failure;
            activeToast.title = error instanceof CdnApiError ? error.message : "Failed to undo upload";
          }
        },
      };
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title =
        error instanceof CdnApiError ? error.message : error instanceof Error ? error.message : "Upload failed";
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="filePicker" title="File" value={files} onChange={setFiles} allowMultipleSelection={false} />
      <Form.TextField
        id="pathText"
        title="Or Paste a Path or Link"
        value={pathText}
        onChange={setPathText}
        placeholder="/Users/you/file.png"
      />
    </Form>
  );
}
