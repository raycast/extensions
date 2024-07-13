import { Form, ActionPanel, Action, showToast, Detail, Toast } from "@raycast/api";
import { useState } from "react";
import fs from "fs";
import path from "path";
import os from "os";

type Values = {
  base64: string;
};

export default function Command() {
  const [image, setImage] = useState<string | null>(null);

  function handleSubmit({ base64 }: Values) {
    if (!base64) {
      showToast({ title: "Error", message: "Please enter a base64 string", style: Toast.Style.Failure });
      return;
    }

    function isValidBase64(str: string): boolean {
      if (!str) return false;
      const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
      return base64Regex.test(str);
    }

    const cleanedBase64 = base64.replaceAll('"', "").split(",").pop() || "";
    if (!isValidBase64(cleanedBase64)) {
      showToast({
        title: "Error",
        message: "Invalid base64 string. Please check your input.",
        style: Toast.Style.Failure,
      });
      return;
    }

    let imageData: string;

    if (!base64.startsWith("data:image/")) {
      imageData = `data:image/png;base64,${base64}`;
    } else {
      imageData = base64.replaceAll('"', "");
    }

    setImage(imageData);
  }

  function handleDownload() {
    if (!image) return;

    const downloadsPath = path.join(os.homedir(), "Downloads");
    const fileName = `image_${Date.now()}.png`;
    const filePath = path.join(downloadsPath, fileName);

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    fs.writeFile(filePath, buffer, (err) => {
      if (err) {
        showToast({ title: "Error", message: "Failed to download image", style: Toast.Style.Failure });
      } else {
        showToast({ title: "Success", message: `Image downloaded to ${filePath}`, style: Toast.Style.Success });
      }
    });
  }

  if (image) {
    return (
      <Detail
        markdown={`![Converted Image](${image})`}
        actions={
          <ActionPanel>
            <Action title="Convert Another" onAction={() => setImage(null)} />
            <Action title="Download Image" onAction={handleDownload} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="base64" title="Base 64" placeholder="Paste your base64 image here" />
    </Form>
  );
}
