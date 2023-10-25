import { Form, ActionPanel, Action, Toast, showToast, open, Clipboard } from "@raycast/api";
import fs from "fs";
import { useState } from "react";
import fetch from "node-fetch";
import FormData from "form-data";
import path from "path";

export default function Command() {
  const [file, setFile] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  async function handleSubmit() {
    const uploadToast = await showToast(Toast.Style.Animated, "Uploading", "Please wait...");
    setUploading(true);
    const url = "https://0x0.st";
    try {
      const formData = new FormData();
      const fileBuffer = fs.readFileSync(file[0]);
      formData.append("file", fileBuffer, {
        filename: path.basename(file[0]),
      });

      const response = await fetch(url, {
        method: "POST",
        headers: formData.getHeaders(),
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.text();
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
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload" onSubmit={() => handleSubmit()} />
        </ActionPanel>
      }
      isLoading={uploading}
    >
      <Form.FilePicker id="files" value={file} onChange={setFile} allowMultipleSelection={false} />
    </Form>
  );
}
