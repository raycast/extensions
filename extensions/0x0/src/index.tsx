import { Form, ActionPanel, Action, Toast, showToast, open, Clipboard, Icon } from "@raycast/api";
import fs from "node:fs";
import { useState } from "react";
import path from "node:path";
import { FormValidation, useForm } from "@raycast/utils";
import { addHistoryItem, getInstanceUrl, USER_AGENT } from "./storage";

interface UploadFormValues {
  file: string[];
}

function parseExpiresHeader(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  // Header carries epoch-seconds; storage compares against Date.now() (ms).
  return parsed * 1000;
}

export default function Command() {
  const [uploading, setUploading] = useState(false);
  const { handleSubmit, itemProps } = useForm<UploadFormValues>({
    async onSubmit(values) {
      const uploadToast = await showToast(Toast.Style.Animated, "Uploading", "Please wait...");
      setUploading(true);
      const url = getInstanceUrl();
      try {
        const formData = new FormData();
        const filePath = values.file[0];
        const fileBuffer = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);
        const blob = new Blob([fileBuffer]);
        formData.append("file", blob, fileName);

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "User-Agent": USER_AGENT,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! Status: ${response.status}${errorText ? ` - ${errorText}` : ""}`);
        }

        const result = (await response.text()).trim();
        if (!result) {
          throw new Error("Empty response from server");
        }

        await addHistoryItem({
          url: result,
          fileName,
          token: response.headers.get("X-Token") ?? undefined,
          uploadedAt: Date.now(),
          expiresAt: parseExpiresHeader(response.headers.get("X-Expires")),
          instanceUrl: url,
        });

        uploadToast.style = Toast.Style.Success;
        uploadToast.title = "Upload successful";
        uploadToast.message = "Link copied to clipboard";
        await Clipboard.copy(result);
        uploadToast.primaryAction = {
          title: "Open in Browser",
          onAction: (toast) => {
            open(result);
            toast.hide();
          },
        };
        setUploading(false);
      } catch (error) {
        setUploading(false);
        uploadToast.style = Toast.Style.Failure;
        uploadToast.title = "Upload failed";
        uploadToast.message = error instanceof Error ? error.message : "Unknown error occurred";
      }
    },
    validation: {
      file: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload" onSubmit={handleSubmit} icon={Icon.Upload} />
        </ActionPanel>
      }
      isLoading={uploading}
    >
      <Form.FilePicker allowMultipleSelection={false} {...itemProps.file} title="File" />
    </Form>
  );
}
