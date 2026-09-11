import { Form, ActionPanel, Action, closeMainWindow, open, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { statSync } from "node:fs";
import { getSelectedFinderPaths } from "./utils";

const ALLOWED_EXTENSIONS = new Set([
  // .image, .png, .jpeg, .tiff, .bmp, .gif, .heic, .webP
  "png",
  "jpg",
  "jpeg",
  "tiff",
  "tif",
  "bmp",
  "gif",
  "heic",
  "heif",
  "webp",
  // .mpeg4Movie, .quickTimeMovie, .movie, .video
  "mp4",
  "m4v",
  "mov",
  "avi",
  "mkv",
  "wmv",
  "mpg",
  "mpeg",
]);

async function openFiles(filepaths: string[]) {
  try {
    await Promise.all(filepaths.map((fp) => open(fp, "macshot")));
    await closeMainWindow();
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Failed to open file in macshot" });
  }
}

export default function Command() {
  const [files, setFiles] = useState<string[]>([]);

  useEffect(() => {
    async function init() {
      const filepaths = await getSelectedFinderPaths();
      if (filepaths.length > 0) {
        const unsupportedFiles = filepaths.filter((filepath) => {
          const ext = filepath.split(".").pop()?.toLowerCase() ?? "";
          try {
            return !statSync(filepath).isFile() || !ALLOWED_EXTENSIONS.has(ext);
          } catch {
            return true;
          }
        });

        if (unsupportedFiles.length > 0) {
          await showToast({ style: Toast.Style.Failure, title: "Unsupported file type" });
          return;
        }

        await openFiles(filepaths);
      }
    }
    init();
  }, []);

  async function handleSubmit(values: { files: string[] }) {
    if (values.files.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No file selected" });
      return;
    }
    const ext = values.files[0].split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      await showToast({ style: Toast.Style.Failure, title: "Unsupported file type" });
      return;
    }
    await openFiles(values.files);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Open in Macshot" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" title="File" value={files} onChange={setFiles} allowMultipleSelection={false} />
    </Form>
  );
}
