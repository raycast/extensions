import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  useNavigation,
  getPreferenceValues,
  Detail,
  Icon,
} from "@raycast/api";
import React, { useState, useEffect } from "react";
import { getAccessToken, uploadFileToGCS, getFileFromClipboard } from "./utils";
import fs from "fs";
import path from "path";
import mime from "mime-types";
import UploadResult from "./UploadResult";

interface FormValues {
  files: string[];
}

type ViewState = "loading" | "preview" | "picker" | "uploading" | "result";

export default function Command() {
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [filePath, setFilePath] = useState<string | null>(null);
  const { push } = useNavigation();

  const { bucketName } = getPreferenceValues<Preferences>();

  // Check clipboard on mount
  useEffect(() => {
    async function checkClipboard() {
      try {
        const clipboardFile = await getFileFromClipboard();
        if (clipboardFile && fs.existsSync(clipboardFile)) {
          setFilePath(clipboardFile);
          setViewState("preview");
        } else {
          // Clipboard empty or not a file, show file picker
          setViewState("picker");
        }
      } catch (err) {
        console.error("Error checking clipboard:", err);
        setViewState("picker");
      }
    }
    checkClipboard();
  }, []);

  const handleUpload = async (fileToUpload: string) => {
    setViewState("uploading");
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Uploading...",
    });

    try {
      const token = await getAccessToken();
      const url = await uploadFileToGCS(fileToUpload, token);

      toast.style = Toast.Style.Success;
      toast.title = "Upload Successful";

      // Navigate to Result View
      push(
        <UploadResult
          fileUrl={url}
          fileName={path.basename(fileToUpload)}
          bucketName={bucketName}
        />,
      );
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Upload Failed";
      toast.message =
        err instanceof Error ? err.message : "Unknown error occurred";
      setViewState("preview"); // Go back to preview or picker
    }
  };

  const handleFormSubmit = async (values: FormValues) => {
    if (!values.files || values.files.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No file selected",
        message: "Please select a file to upload.",
      });
      return;
    }

    const selectedFile = values.files[0];
    if (!fs.existsSync(selectedFile)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "File not found",
        message: "The selected file could not be found.",
      });
      return;
    }

    setFilePath(selectedFile);
    await handleUpload(selectedFile);
  };

  const switchToManualPicker = () => {
    setFilePath(null);
    setViewState("picker");
  };

  // Loading View
  if (viewState === "loading") {
    return <Detail isLoading={true} markdown="# 🔍 Checking clipboard..." />;
  }

  // Uploading View
  if (viewState === "uploading") {
    return <Detail isLoading={true} markdown="# ☁️ Uploading..." />;
  }

  // Preview View (Clipboard has content)
  if (viewState === "preview" && filePath) {
    const fileName = path.basename(filePath);
    const contentType = mime.lookup(filePath) || "file";
    const isImage = contentType.toString().startsWith("image");
    const fileSize = (fs.statSync(filePath).size / 1024).toFixed(2);

    const markdown = `
# 📸 Found in Clipboard

**Ready to upload this file to GCS?**

---
${isImage ? `![Preview](file://${filePath})` : `📄 **File:** \`${fileName}\``}
`;

    return (
      <Detail
        markdown={markdown}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="File Name" text={fileName} />
            <Detail.Metadata.Label title="Size" text={`${fileSize} KB`} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Target Bucket" text={bucketName} />
            <Detail.Metadata.Label title="Type" text={contentType.toString()} />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action
              title="Upload"
              icon={Icon.Cloud}
              onAction={() => handleUpload(filePath)}
            />
            <Action
              title="Choose Different File"
              icon={Icon.Finder}
              onAction={switchToManualPicker}
            />
          </ActionPanel>
        }
      />
    );
  }

  // File Picker View (Clipboard empty or user chose manual)
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload File" onSubmit={handleFormSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        title="File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles={true}
      />
      <Form.Description text="No file found in clipboard. Select a file to upload to Google Cloud Storage." />
    </Form>
  );
}
