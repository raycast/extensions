import { Form, ActionPanel, Action, Toast, showToast, open, Clipboard, Icon } from "@raycast/api";
import fs from "fs";
import { useState } from "react";
import fetch from "node-fetch";
import FormData from "form-data";
import path from "path";
import { FormValidation, useForm } from "@raycast/utils";

interface UploadFormValues {
  file: string[];
}

export default function Command() {
  const [uploading, setUploading] = useState(false);
  const { handleSubmit, itemProps } = useForm<UploadFormValues>({
    async onSubmit(values) {
      const uploadToast = await showToast(Toast.Style.Animated, "Uploading", "Please wait...");
      setUploading(true);
      const url = "https://0x0.st";
      try {
        const formData = new FormData();
        const filePath = values.file[0];
        const fileBuffer = fs.readFileSync(filePath);
        formData.append("file", fileBuffer, {
          filename: path.basename(filePath),
        });

        const headers = formData.getHeaders();
        // Set a proper User-Agent as recommended by 0x0.st documentation
        headers["User-Agent"] = "0x0-raycast/1.0";

        const response = await fetch(url, {
          method: "POST",
          headers: headers,
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
