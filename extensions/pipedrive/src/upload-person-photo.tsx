import { Action, ActionPanel, Form, Toast, getPreferenceValues, showToast, useNavigation } from "@raycast/api";
import { basename, extname } from "path";
import { stat } from "fs/promises";

import { buildPipedriveApiUrl, fetchPipedriveJson, isAbortError } from "./pipedrive-client";
import { readFileAsBuffer } from "./pipedrive-avatar-cache";

export default function UploadPersonPhoto({ personId, onUploaded }: { personId: string; onUploaded?: () => void }) {
  const preferences = getPreferenceValues<Preferences.Index>();
  const { pop } = useNavigation();

  function inferMimeType(filePath: string): string | null {
    const ext = extname(filePath).toLowerCase();
    switch (ext) {
      case ".png":
        return "image/png";
      case ".jpg":
      case ".jpeg":
        return "image/jpeg";
      case ".gif":
        return "image/gif";
      default:
        return null;
    }
  }

  async function handleSubmit(values: { file?: string[] }) {
    const filePath = values.file?.[0];
    if (!filePath) {
      await showToast({ style: Toast.Style.Failure, title: "Choose an image" });
      return;
    }

    const mimeType = inferMimeType(filePath);
    if (!mimeType) {
      await showToast({ style: Toast.Style.Failure, title: "Unsupported image type", message: "Use PNG or JPG." });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Uploading photo…" });

    const abortable = new AbortController();
    try {
      await stat(filePath);

      const url = buildPipedriveApiUrl(preferences, `/api/v1/persons/${personId}/picture`);

      const bytes = await readFileAsBuffer(filePath);
      const blobBytes = Uint8Array.from(bytes);
      const filename = basename(filePath);
      const form = new FormData();
      form.append("file", new Blob([blobBytes], { type: mimeType }), filename);

      await fetchPipedriveJson<Record<string, unknown>>(preferences, url, {
        method: "POST",
        body: form,
        signal: abortable.signal,
      });

      toast.style = Toast.Style.Success;
      toast.title = "Photo uploaded";

      onUploaded?.();
      pop();
    } catch (error) {
      if (isAbortError(error)) {
        await toast.hide();
        return;
      }
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to upload photo";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <Form
      navigationTitle="Upload Photo"
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm title="Upload" onSubmit={handleSubmit} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title="Image"
        canChooseFiles
        canChooseDirectories={false}
        allowMultipleSelection={false}
      />
    </Form>
  );
}
