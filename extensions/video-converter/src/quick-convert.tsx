import React from "react";
import { Action, ActionPanel, Form } from "@raycast/api";
import errorInfo from "./components/ffmpegNotFound";
import Conversion from "./components/conversion";
import ErrorBoundary from "./components/ErrorBoundary";
import { useVideoConverter } from "./hooks/useVideoConverter";
import { AVAILABLE_VIDEO_FORMATS, filterByExtensions, type VideoFormat, CODEC_OPTIONS } from "./types";

export default function QuickConvert() {
  const { formData, isSubmitted, isFfmpegInstalled, handleChange, handleSubmit } = useVideoConverter(true);

  const handleFormatChange = (format: VideoFormat) => {
    handleChange("videoFormat", format);
    handleChange("videoCodec", CODEC_OPTIONS[format][0]);
  };

  // ------------------------------------
  // Render Logic
  // ------------------------------------
  if (!isFfmpegInstalled) return errorInfo();
  if (!formData) return <Form isLoading />;
  if (isSubmitted)
    return (
      <ErrorBoundary>
        <Conversion values={formData} />
      </ErrorBoundary>
    );

  return (
    <ErrorBoundary>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Convert" onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        <Form.Separator />

        <Form.FilePicker
          id="videoFiles"
          title="Files"
          value={formData.videoFiles}
          onChange={(files) => handleChange("videoFiles", filterByExtensions(files, AVAILABLE_VIDEO_FORMATS))}
          allowMultipleSelection
          canChooseFiles
          canChooseDirectories={false}
        />

        <Form.Dropdown
          id="videoFormat"
          title="Format"
          value={formData.videoFormat}
          onChange={(v) => handleFormatChange(v as VideoFormat)}
        >
          {AVAILABLE_VIDEO_FORMATS.map((fmt) => (
            <Form.Dropdown.Item key={fmt} value={fmt} title={fmt.toUpperCase()} />
          ))}
        </Form.Dropdown>

        <Form.FilePicker
          id="outputFolder"
          title="Output Folder"
          value={formData.outputFolder}
          onChange={(folders) => handleChange("outputFolder", folders)}
          canChooseDirectories
          allowMultipleSelection={false}
          canChooseFiles={false}
        />

        <Form.Checkbox
          id="useHardwareAcceleration"
          label="Use Hardware Acceleration"
          info="Enable hardware acceleration for encoding. This may speed up conversion but may not be supported on all formats."
          value={formData.useHardwareAcceleration}
          onChange={(v) => handleChange("useHardwareAcceleration", v)}
        />
      </Form>
    </ErrorBoundary>
  );
}
