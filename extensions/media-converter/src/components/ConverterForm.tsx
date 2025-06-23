import { Form, ActionPanel, Action, showToast, Toast, showInFinder, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import {
  convertMedia,
  checkExtensionType,
  OUTPUT_VIDEO_EXTENSIONS,
  OUTPUT_AUDIO_EXTENSIONS,
  OUTPUT_IMAGE_EXTENSIONS,
  OUTPUT_ALL_EXTENSIONS,
} from "../utils/converter";

export function ConverterForm({ initialFiles = [] }: { initialFiles?: string[] }) {
  const [selectedFileType, setSelectedFileType] = useState<"video" | "image" | "audio" | null>(null);
  const [currentFiles, setCurrentFiles] = useState<string[]>(initialFiles || []);
  const [outputFormat, setOutputFormat] = useState<(typeof OUTPUT_ALL_EXTENSIONS)[number] | null>(null);
  // TODO: Proper type for quality setting? Maybe split the quality setting into a union type for each format?
  // Currently represents 0-100 in steps of 5 (as strings) for jpg heic avif webp, "lossless" for webp, "lzw" or "deflate" for tiff, "png-24" or "png-8" for png
  const [currentQualitySetting, setCurrentQualitySetting] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [filePickerError, setFilePickerError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      handleFileSelect(initialFiles);
    } else {
      // TODO: fix this
      setIsLoading(false);
    }
  }, [initialFiles]);

  const handleFileSelect = (files: string[]) => {
    // Clear previous error
    setFilePickerError(undefined);

    if (files.length === 0) {
      setCurrentFiles([]);
      setSelectedFileType(null);
      return;
    }

    try {
      let primaryFileType: "video" | "image" | "audio" | false = false;
      for (const file of files) {
        const type = checkExtensionType(file);
        if (type) {
          primaryFileType = type as "video" | "image" | "audio";
          break; // Found the first valid file type
        }
      }

      if (!primaryFileType) {
        setFilePickerError("No valid media files selected. Please select video, image, or audio files.");
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid selection",
          message: filePickerError,
        });
        setCurrentFiles([]);
        setSelectedFileType(null);
        return;
      }

      const processedFiles = files.filter((file) => {
        return checkExtensionType(file) === primaryFileType;
      });

      if (processedFiles.length < files.length) {
        setFilePickerError(
          `Kept ${processedFiles.length} ${primaryFileType} file${processedFiles.length > 1 ? "s" : ""}. ${files.length - processedFiles.length} other file${files.length - processedFiles.length > 1 ? "s" : ""} from your selection were invalid or of a different type and have been discarded.`,
        );
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid files in selection",
          message: filePickerError,
        });
      } else {
        // Clear error if all files are valid
        setFilePickerError(undefined);
      }

      setCurrentFiles(processedFiles);
      setSelectedFileType(primaryFileType);

      // Initialize output format with default value based on file type
      if (primaryFileType === "image") {
        setOutputFormat(".jpg");
        setCurrentQualitySetting("80");
      } else if (primaryFileType === "audio") {
        setOutputFormat(".mp3");
        setCurrentQualitySetting("");
      } else if (primaryFileType === "video") {
        setOutputFormat(".mp4");
        setCurrentQualitySetting("");
      }
    } catch (error) {
      const errorMessage = String(error);
      setFilePickerError(errorMessage);
      showToast({
        style: Toast.Style.Failure,
        title: "Error processing files",
        message: errorMessage,
      });
      setCurrentFiles([]);
      setSelectedFileType(null);
    }

    setIsLoading(false);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      // TODO: When converting video, we could show the progress percentage. This would require to find a solution when multiple files are being converted.
      // I don't think it is possible to show the progress of images. Unsure about audio.
      title: `Converting ${currentFiles.length} file${currentFiles.length > 1 ? "s" : ""}...`,
    });

    for (const item of currentFiles) {
      try {
        let outputPath: string;
        if (selectedFileType === "image") {
          outputPath = await convertMedia(
            item,
            outputFormat as (typeof OUTPUT_IMAGE_EXTENSIONS)[number],
            currentQualitySetting,
          );
        } else if (selectedFileType === "audio") {
          outputPath = await convertMedia(item, outputFormat as (typeof OUTPUT_AUDIO_EXTENSIONS)[number]);
        } else {
          outputPath = await convertMedia(item, outputFormat as (typeof OUTPUT_VIDEO_EXTENSIONS)[number]);
        }

        await toast.hide();
        await showToast({
          style: Toast.Style.Success,
          title: "File converted successfully!",
          message: "⌘O to open the file",
          primaryAction: {
            title: "Open File",
            shortcut: { modifiers: ["cmd"], key: "o" },
            onAction: () => {
              showInFinder(outputPath);
            },
          },
        });
      } catch (error) {
        await toast.hide();
        const errorMessage = String(error);

        // Check if the error is related to FFmpeg not being installed
        if (errorMessage.includes("FFmpeg is not installed or configured")) {
          await showToast({
            style: Toast.Style.Failure,
            title: "FFmpeg Not Found",
            message: "FFmpeg needs to be installed to convert files",
            primaryAction: {
              title: "Install FFmpeg",
              onAction: () => {
                // Re-run the command to trigger the installation flow
                // This will bring up the FFmpeg installation page
                showToast({
                  style: Toast.Style.Animated,
                  title: "Opening FFmpeg installer...",
                });
              },
            },
          });
        } else {
          await showToast({ style: Toast.Style.Failure, title: "Conversion failed", message: errorMessage });
        }
      }
    }
    setIsLoading(false);
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {currentFiles && currentFiles.length > 0 && selectedFileType && (
            <Action.SubmitForm
              title="Convert"
              onSubmit={handleSubmit}
              icon={Icon.NewDocument}
              // For some reason, this still shows up as cmd+return instead of just return, so no use for now
              /* shortcut={{ modifiers: [], key: "return" }} */
            />
          )}
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="selectFiles"
        title="Select files"
        allowMultipleSelection={true}
        value={currentFiles}
        onChange={(newFiles) => {
          handleFileSelect(newFiles);
        }}
        // Having an active error prevents the form from submitting, so no filePicker error I guess
        /* error={filePickerError} */
      />
      {selectedFileType && (
        <Form.Dropdown
          id="format"
          title="Select output format"
          value={
            outputFormat || (selectedFileType === "image" ? ".jpg" : selectedFileType === "audio" ? ".mp3" : ".mp4")
          }
          onChange={(newFormat) => {
            setOutputFormat(newFormat as (typeof OUTPUT_ALL_EXTENSIONS)[number]);
          }}
        >
          {selectedFileType === "image" ? (
            <Form.Dropdown.Section title="Image Formats">
              {/* HEIC is only supported on macOS with SIPS, so we filter it out on other platforms. */}
              {OUTPUT_IMAGE_EXTENSIONS.filter((format) => process.platform === "darwin" || format !== ".heic").map(
                (format) => (
                  <Form.Dropdown.Item key={format} value={format} title={format} />
                ),
              )}
            </Form.Dropdown.Section>
          ) : selectedFileType === "audio" ? (
            <Form.Dropdown.Section title="Audio Formats">
              {OUTPUT_AUDIO_EXTENSIONS.map((format) => (
                <Form.Dropdown.Item key={format} value={format} title={format} />
              ))}
            </Form.Dropdown.Section>
          ) : (
            <Form.Dropdown.Section title="Video Formats">
              {OUTPUT_VIDEO_EXTENSIONS.map((format) => (
                <Form.Dropdown.Item key={format} value={format} title={format} />
              ))}
            </Form.Dropdown.Section>
          )}
        </Form.Dropdown>
      )}
      {selectedFileType === "image" &&
        outputFormat &&
        (OUTPUT_IMAGE_EXTENSIONS as ReadonlyArray<string>).includes(outputFormat) && (
          <>
            <Form.Dropdown
              id="qualitySetting"
              title={`Select quality`}
              value={currentQualitySetting}
              onChange={setCurrentQualitySetting}
            >
              {outputFormat === ".png" && (
                <Form.Dropdown.Section>
                  <Form.Dropdown.Item value="png-24" title="PNG-24 (24-bit RGB, full color)" />
                  <Form.Dropdown.Item value="png-8" title="PNG-8 (8-bit indexed, 256 colors)" />
                </Form.Dropdown.Section>
              )}
              {outputFormat === ".webp" && (
                <Form.Dropdown.Section>
                  <Form.Dropdown.Item value="lossless" title="Lossless" />
                </Form.Dropdown.Section>
              )}
              {outputFormat !== ".png" && (
                <Form.Dropdown.Section>
                  {outputFormat !== ".tiff" ? (
                    [...Array(21).keys()].map((i) => {
                      const q = 100 - i * 5;
                      const value = q.toString();
                      const title = outputFormat === ".avif" && q === 100 ? `100 (lossless)` : value;

                      return <Form.Dropdown.Item key={`${outputFormat}-q-${q}`} value={value} title={title} />;
                    })
                  ) : (
                    <>
                      <Form.Dropdown.Item value="deflate" title="Deflate (recommended, smaller size)" />
                      <Form.Dropdown.Item value="lzw" title="LZW (wider compatibility)" />
                    </>
                  )}
                </Form.Dropdown.Section>
              )}
            </Form.Dropdown>
            {outputFormat === ".tiff" && <Form.Description text={`Here, .tiff is always lossless.`} />}
            {outputFormat === ".png" && (
              <Form.Description
                text={`PNG-24 is lossless with full color range. PNG-8 uses indexed colors (256 max) for smaller file sizes. \nFFmpeg's PNG-8 implementation badly handles transparency.`}
              />
            )}
          </>
        )}
    </Form>
  );
}
