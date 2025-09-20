import React from "react";
import { ActionPanel, Action, Form } from "@raycast/api";
import errorInfo from "./components/ffmpegNotFound";
import Conversion from "./components/conversion";
import { useVideoConverter, sanitizeNumericInput } from "./hooks/useVideoConverter";
import {
  AVAILABLE_VIDEO_FORMATS,
  AVAILABLE_AUDIO_FORMATS,
  AVAILABLE_PRESETS,
  filterByExtensions,
  type VideoFormat,
  type CompressionMode,
  type VideoCodec,
  type Preset,
  CODEC_OPTIONS,
} from "./types";

export default function VideoConverter() {
  const {
    formData,
    isSubmitted,
    isFfmpegInstalled,
    handleChange,
    handleSubmit,
    handleSaveDefaults,
    handleResetDefaults,
  } = useVideoConverter();

  // ------------------------------------
  // Render Logic
  // ------------------------------------
  if (!isFfmpegInstalled) return errorInfo();
  if (!formData) return <Form isLoading />;
  if (isSubmitted) return <Conversion values={formData} />;

  const availableCodecs = CODEC_OPTIONS[formData.videoFormat];

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert" onSubmit={handleSubmit} />
          <Action
            title="Save as Default Settings"
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={handleSaveDefaults}
          />
          <Action
            title="Reset Default Settings"
            shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
            onAction={handleResetDefaults}
          />
        </ActionPanel>
      }
    >
      <Form.Separator />

      <Form.FilePicker
        id="videoFiles"
        title="Video Files"
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
        onChange={(v) => {
          const format = v as VideoFormat;
          handleChange("videoFormat", format);
          handleChange("videoCodec", CODEC_OPTIONS[format][0]);
        }}
      >
        {AVAILABLE_VIDEO_FORMATS.map((fmt) => (
          <Form.Dropdown.Item key={fmt} value={fmt} title={fmt.toUpperCase()} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="videoCodec"
        title="Codec"
        value={formData.videoCodec}
        onChange={(v) => handleChange("videoCodec", v as VideoCodec)}
      >
        {availableCodecs.map((codec) => (
          <Form.Dropdown.Item key={codec} value={codec} title={codec} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="preset"
        title="Preset"
        value={formData.preset}
        info="Faster presets (like ultrafast, superfast) encode quicker but result in larger files or lower quality for the same bitrate. Slower presets (like slow, veryslow) take longer to encode but produce better compression (smaller size or better quality)."
        onChange={(v) => handleChange("preset", v as Preset)}
      >
        {AVAILABLE_PRESETS.map((preset) => (
          <Form.Dropdown.Item key={preset} value={preset} title={preset.charAt(0).toUpperCase() + preset.slice(1)} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="compressionMode"
        title="Compression Mode"
        value={formData.compressionMode}
        onChange={(v) => handleChange("compressionMode", v as CompressionMode)}
      >
        <Form.Dropdown.Item value="bitrate" title="Bitrate (kbps)" />
        <Form.Dropdown.Item value="filesize" title="Max File Size (MB)" />
      </Form.Dropdown>

      {formData.compressionMode === "bitrate" ? (
        <Form.TextField
          id="bitrate"
          title="Bitrate"
          value={formData.bitrate.toString()}
          onChange={(v) => handleChange("bitrate", sanitizeNumericInput(v))}
          info="Target bitrate in kbps (e.g., 10000 for 10 Mbps)"
        />
      ) : (
        <Form.TextField
          id="maxSize"
          title="Max Size"
          value={formData.maxSize.toString()}
          onChange={(v) => handleChange("maxSize", v)}
          info="Maximum file size in MB"
        />
      )}

      <Form.Separator />

      <Form.FilePicker
        id="audioFiles"
        title="Replace Audio"
        value={formData.audioFiles}
        onChange={(files) => handleChange("audioFiles", filterByExtensions(files, AVAILABLE_AUDIO_FORMATS).slice(0, 1))}
        allowMultipleSelection={false}
        canChooseFiles
        canChooseDirectories={false}
      />

      <Form.Dropdown
        id="audioBitrate"
        title="Audio Bitrate"
        value={formData.audioBitrate.toString()}
        onChange={(v) => handleChange("audioBitrate", sanitizeNumericInput(v))}
      >
        <Form.Dropdown.Item value="64" title="64 kbps (very low)" />
        <Form.Dropdown.Item value="96" title="96 kbps (low)" />
        <Form.Dropdown.Item value="128" title="128 kbps (standard)" />
        <Form.Dropdown.Item value="192" title="192 kbps (good quality)" />
        <Form.Dropdown.Item value="256" title="256 kbps (high)" />
        <Form.Dropdown.Item value="320" title="320 kbps (maximum)" />
      </Form.Dropdown>

      <Form.Separator />

      <Form.FilePicker
        id="outputFolder"
        title="Output Folder"
        value={formData.outputFolder}
        onChange={(folders) => handleChange("outputFolder", folders)}
        canChooseDirectories
        allowMultipleSelection={false}
        canChooseFiles={false}
      />

      <Form.TextField
        id="subfolderName"
        title="Subfolder Name"
        value={formData.subfolderName}
        onChange={(v) => handleChange("subfolderName", v)}
        info="Optional: Create a subfolder in the output directory"
      />

      <Form.TextField
        id="rename"
        title="Rename Pattern"
        value={formData.rename}
        onChange={(v) => handleChange("rename", v)}
        info="Optional: Use {name} for file name, {ext} for file extension, {format} for format, {codec} for codec, {len} for duration"
      />

      <Form.Checkbox
        id="useHardwareAcceleration"
        label="Use Hardware Acceleration"
        value={formData.useHardwareAcceleration}
        onChange={(v) => handleChange("useHardwareAcceleration", v)}
        info="Enable hardware acceleration for encoding. This may speed up conversion but may not be supported on all formats."
      />

      <Form.Checkbox
        id="deleteOriginalFiles"
        label="Delete Original Files"
        value={formData.deleteOriginalFiles}
        onChange={(v) => handleChange("deleteOriginalFiles", v)}
        info="Delete original files after successful conversion"
      />
    </Form>
  );
}
