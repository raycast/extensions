import { ActionPanel, Form, Action, showToast, Toast, getSelectedFinderItems } from "@raycast/api";
import { useState, useEffect } from "react";
import { convertVideo, convertImage, convertAudio } from "./utils/converter";
import path from "path";

const ALLOWED_EXTENSIONS = [".mov", ".mp4", ".avi", ".mkv", ".mpg"];
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".png", ".webp"];
const ALLOWED_AUDIO_EXTENSIONS = [".mp3", ".aac", ".wav", ".m4a", ".flac"];

export default function ConvertForm() {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"video" | "image" | "audio" | null>(null);
  const [formats, setFormats] = useState<string[]>([]);

  useEffect(() => {
    async function getFileFromFinder() {
      try {
        const items = await getSelectedFinderItems();

        if (!items || items.length === 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "No file selected",
            message: "Please select a file in Finder to convert.",
          });
          return;
        }

        const selectedFile = items[0].path;
        const ext = path.extname(selectedFile).toLowerCase();

        let detectedType: "video" | "image" | "audio" | null = null;

        if (ALLOWED_EXTENSIONS.includes(ext)) {
          detectedType = "video";
          setFormats(["mp4", "avi", "mkv", "mov", "mpg"]);
        } else if (ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
          detectedType = "image";
          setFormats(["jpg", "png", "webp"]);
        } else if (ALLOWED_AUDIO_EXTENSIONS.includes(ext)) {
          detectedType = "audio";
          setFormats(["mp3", "aac", "wav", "flac"]);
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "Unsupported file type",
            message: "The selected file type is not supported for conversion.",
          });
          return;
        }

        setFilePath(selectedFile);
        setFileType(detectedType);
      } catch (error) {
        console.error("Error getting selected file:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "An error occurred while retrieving the selected file.",
        });
      }
    }

    getFileFromFinder();
  }, []);

  async function handleSubmit(values: { format: string }) {
    if (!filePath || !fileType) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No file selected",
        message: "Please select a file to proceed.",
      });
      return;
    }

    try {
      let outputPath = "";
      if (fileType === "image") {
        outputPath = await convertImage(filePath, values.format as "jpg" | "png" | "webp");
      } else if (fileType === "audio") {
        outputPath = await convertAudio(filePath, values.format as "mp3" | "aac" | "wav" | "flac");
      } else {
        outputPath = await convertVideo(filePath, values.format as "mp4" | "avi" | "mkv" | "mov" | "mpg");
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Conversion Successful!",
        message: `File saved to ${outputPath}`,
      });
    } catch (error) {
      console.error("Error during conversion:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Conversion Failed",
        message: "An error occurred during the file conversion process.",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert File" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {filePath ? (
        <>
          <Form.Description title="Selected File" text={filePath} />
          <Form.Dropdown id="format" title="Output Format" defaultValue={formats[0]}>
            {formats.map((format) => (
              <Form.Dropdown.Item key={format} value={format} title={format.toUpperCase()} />
            ))}
          </Form.Dropdown>
        </>
      ) : (
        <Form.Description title="No File Selected" text="Please select a file in Finder to proceed." />
      )}
    </Form>
  );
}
