import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import fs from "fs";
import path from "path";
import os from "os";
import { sanitizeFileName, validatePathSafety, validateFileSize } from "../utils/fileValidation";

interface SaveImageFormProps {
  fullImagePath: string;
  onSaved: () => void;
  originalFileName?: string;
}

export function SaveImageForm({ fullImagePath, onSaved, originalFileName }: SaveImageFormProps) {
  const { pop } = useNavigation();
  const baseName = originalFileName ? path.parse(originalFileName).name : "dither-image";
  const [fileName, setFileName] = useState<string>(`${baseName}-${Date.now()}.png`);
  const [saveDirectory, setSaveDirectory] = useState<string[]>([]);

  async function handleSave(values: { fileName: string; saveDirectory: string[] }): Promise<void> {
    try {
      // Validate source file size
      const sourceFileCheck = validateFileSize(fullImagePath);
      if (!sourceFileCheck.valid) {
        showFailureToast({ title: "Save Error", message: sourceFileCheck.error || "Source file is too large" });
        return;
      }

      // Sanitize filename
      const rawFileName = values.fileName || fileName;
      const sanitizedFileName = sanitizeFileName(rawFileName);

      // Ensure .png extension
      const fileNameWithExt = sanitizedFileName.toLowerCase().endsWith(".png")
        ? sanitizedFileName
        : `${sanitizedFileName}.png`;

      const targetDirectory =
        values.saveDirectory &&
        values.saveDirectory.length > 0 &&
        fs.existsSync(values.saveDirectory[0]) &&
        fs.lstatSync(values.saveDirectory[0]).isDirectory()
          ? values.saveDirectory[0]
          : path.join(os.homedir(), "Desktop");

      // Validate path safety - ensure no path traversal
      if (!validatePathSafety(targetDirectory, os.homedir())) {
        showFailureToast({ title: "Save Error", message: "Invalid save directory path" });
        return;
      }

      const savePath = path.join(targetDirectory, fileNameWithExt);

      // Final path safety check
      if (!validatePathSafety(savePath, targetDirectory)) {
        showFailureToast({ title: "Save Error", message: "Invalid file path" });
        return;
      }

      // Check if file already exists and would be overwritten
      if (fs.existsSync(savePath)) {
        // In a real app, you might want to ask user for confirmation
        // For now, we'll just overwrite
      }

      fs.copyFileSync(fullImagePath, savePath);

      await showToast({
        style: Toast.Style.Success,
        title: "Saved",
        message: `Image saved to ${path.dirname(savePath)}`,
      });

      onSaved();
      pop();
    } catch (error) {
      showFailureToast({
        title: "Save Error",
        message: error instanceof Error ? error.message : "Failed to save image",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Image" onSubmit={handleSave} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="fileName"
        title="File Name"
        value={fileName}
        onChange={setFileName}
        placeholder="dither-image.png"
      />
      <Form.FilePicker
        id="saveDirectory"
        title="Save Location"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        value={saveDirectory}
        onChange={setSaveDirectory}
      />
      <Form.Description
        title=""
        text={
          saveDirectory.length > 0 && fs.existsSync(saveDirectory[0])
            ? `Will save to: ${saveDirectory[0]}`
            : "Will save to Desktop if no location selected"
        }
      />
    </Form>
  );
}
