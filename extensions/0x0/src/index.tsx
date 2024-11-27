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
  const { handleSubmit, itemProps, reset } = useForm<UploadFormValues>({
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

        const response = await fetch(url, {
          method: "POST",
          headers: formData.getHeaders(),
          body: formData,
        });
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = (await response.text()).trim();
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
        reset();
      } catch (error) {
        setUploading(false);
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
