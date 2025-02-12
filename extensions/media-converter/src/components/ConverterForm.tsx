import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import path from "path";
import { convertImage, convertAudio, convertVideo } from "../utils/converter";
import { execPromise } from "../utils/exec";

const ALLOWED_VIDEO_EXTENSIONS = [".mov", ".mp4", ".avi", ".mkv", ".mpg", ".webm"];
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".png", ".webp", ".heic", ".tiff"];
const ALLOWED_AUDIO_EXTENSIONS = [".mp3", ".aac", ".wav", ".m4a", ".flac"];

export function ConverterForm() {
  const [selectedFileType, setSelectedFileType] = useState<"video" | "image" | "audio" | null>(null);
  const handleFileSelect = (files: string[]) => {
    if (files.length === 0) {
      setSelectedFileType(null);
      return true;
    }

    try {
      const firstFileExtension = path.extname(files[0])?.toLowerCase() || "";
      const isFirstFileVideo = ALLOWED_VIDEO_EXTENSIONS.includes(firstFileExtension);
      const isFirstFileImage = ALLOWED_IMAGE_EXTENSIONS.includes(firstFileExtension);
      const isFirstFileAudio = ALLOWED_AUDIO_EXTENSIONS.includes(firstFileExtension);

      const hasInvalidSelection = files.some((file) => {
        const extension = path.extname(file)?.toLowerCase() || "";
        if (isFirstFileVideo) return !ALLOWED_VIDEO_EXTENSIONS.includes(extension);
        if (isFirstFileImage) return !ALLOWED_IMAGE_EXTENSIONS.includes(extension);
        if (isFirstFileAudio) return !ALLOWED_AUDIO_EXTENSIONS.includes(extension);
        return true;
      });

      if (hasInvalidSelection) {
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid selection",
          message: "Please select only one type of media (video, image, or audio)",
        });
        setSelectedFileType(null);
        return false;
      }

      if (isFirstFileVideo) setSelectedFileType("video");
      else if (isFirstFileImage) setSelectedFileType("image");
      else if (isFirstFileAudio) setSelectedFileType("audio");
      else setSelectedFileType(null);

      return true;
    } catch (error) {
      console.error("Error in handleFileSelect:", error);
      setSelectedFileType(null);
      return false;
    }
  };

  const handleSubmit = async (values: { videoFile: string[]; format: string }) => {
    if (!values.videoFile || values.videoFile.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No files selected",
        message: "Please select at least one file to convert",
      });
      return;
    }

    const fileExtension = path.extname(values.videoFile[0]).toLowerCase();
    const isInputVideo = ALLOWED_VIDEO_EXTENSIONS.includes(fileExtension);
    const isInputImage = ALLOWED_IMAGE_EXTENSIONS.includes(fileExtension);
    const isInputAudio = ALLOWED_AUDIO_EXTENSIONS.includes(fileExtension);
    const isOutputVideo = ["mp4", "avi", "mkv", "mov", "mpg", "webm"].includes(values.format);
    const isOutputImage = ["jpg", "png", "webp", "heic", "tiff"].includes(values.format);

    if (!isInputVideo && !isInputImage && !isInputAudio) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid file type",
        message: "Please select a valid media file",
      });
      return;
    }

    if ((isInputVideo && isOutputImage) || (isInputImage && isOutputVideo) || (isInputAudio && isOutputVideo)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid conversion",
        message: "Cannot convert between video and image formats",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Converting file...",
    });

    for (const item of values.videoFile) {
      try {
        let outputPath = "";
        if (isInputImage) {
          outputPath = await convertImage(item, values.format as "jpg" | "png" | "webp" | "heic" | "tiff");
        } else if (isInputAudio) {
          outputPath = await convertAudio(item, values.format as "mp3" | "aac" | "wav" | "flac");
        } else {
          outputPath = await convertVideo(item, values.format as "mp4" | "avi" | "mkv" | "mov" | "mpg" | "webm");
        }

        await toast.hide();
        await showToast({
          style: Toast.Style.Success,
          title: "File converted successfully!",
          message: "Press ⌘O to open the converted file",
          primaryAction: {
            title: "Open File",
            shortcut: { modifiers: ["cmd"], key: "o" },
            onAction: () => {
              execPromise(`open "${outputPath}"`);
            },
          },
        });
      } catch (error) {
        await toast.hide();
        await showToast({
          style: Toast.Style.Failure,
          title: "Conversion failed",
          message: String(error),
        });
      }
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="videoFile" title="Select files" allowMultipleSelection={true} onChange={handleFileSelect} />
      {selectedFileType && (
        <Form.Dropdown
          id="format"
          title="Select output format"
          defaultValue={selectedFileType === "image" ? "jpg" : selectedFileType === "audio" ? "mp3" : "mp4"}
        >
          {selectedFileType === "image" ? (
            <Form.Dropdown.Section title="Image Formats">
              <Form.Dropdown.Item value="jpg" title=".jpg" />
              <Form.Dropdown.Item value="png" title=".png" />
              <Form.Dropdown.Item value="webp" title=".webp" />
              <Form.Dropdown.Item value="heic" title=".heic" />
              <Form.Dropdown.Item value="tiff" title=".tiff" />
            </Form.Dropdown.Section>
          ) : selectedFileType === "audio" ? (
            <Form.Dropdown.Section title="Audio Formats">
              <Form.Dropdown.Item value="mp3" title=".mp3" />
              <Form.Dropdown.Item value="aac" title=".aac" />
              <Form.Dropdown.Item value="wav" title=".wav" />
              <Form.Dropdown.Item value="flac" title=".flac" />
            </Form.Dropdown.Section>
          ) : (
            <Form.Dropdown.Section title="Video Formats">
              <Form.Dropdown.Item value="mp4" title=".mp4" />
              <Form.Dropdown.Item value="avi" title=".avi" />
              <Form.Dropdown.Item value="mkv" title=".mkv" />
              <Form.Dropdown.Item value="mov" title=".mov" />
              <Form.Dropdown.Item value="mpg" title=".mpg" />
              <Form.Dropdown.Item value="webm" title=".webm" />
            </Form.Dropdown.Section>
          )}
        </Form.Dropdown>
      )}
    </Form>
  );
}
