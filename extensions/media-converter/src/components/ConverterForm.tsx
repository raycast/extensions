import { Form, ActionPanel, Action, showToast, Toast, showInFinder, Icon, openCommandPreferences } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { convertMedia, checkExtensionType } from "../utils/converter";
import {
  OUTPUT_VIDEO_EXTENSIONS,
  OUTPUT_AUDIO_EXTENSIONS,
  OUTPUT_IMAGE_EXTENSIONS,
  type MediaType,
  type AllOutputExtension,
  type QualitySettings,
  type OutputImageExtension,
  type OutputAudioExtension,
  /* type OutputVideoExtension, */
  type ImageQuality,
  type AudioQuality,
  type VideoQuality,
  getMediaType,
  AUDIO_BITRATES,
  type AudioBitrate,
  AUDIO_SAMPLE_RATES,
  type AudioSampleRate,
  AUDIO_BIT_DEPTH,
  type AudioBitDepth,
  AUDIO_PROFILES,
  type AudioProfile,
  DEFAULT_QUALITIES,
  AUDIO_COMPRESSION_LEVEL,
  type AudioCompressionLevel,
} from "../types/media";

export function ConverterForm({ initialFiles = [] }: { initialFiles?: string[] }) {
  const [selectedFileType, setSelectedFileType] = useState<MediaType | null>(null);
  const [currentFiles, setCurrentFiles] = useState<string[]>(initialFiles || []);
  const [outputFormat, setOutputFormat] = useState<AllOutputExtension | null>(null);
  const [currentQualitySetting, setCurrentQualitySetting] = useState<QualitySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to get default quality settings for a format
  const getDefaultQuality = (format: AllOutputExtension): QualitySettings => {
    return {
      [format]: DEFAULT_QUALITIES[format as keyof typeof DEFAULT_QUALITIES],
    } as MediaType extends "image" ? ImageQuality : MediaType extends "audio" ? AudioQuality : VideoQuality;
  };

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      handleFileSelect(initialFiles);
    } else {
      // TODO: fix this
      setIsLoading(false);
    }
  }, [initialFiles]);

  const handleFileSelect = (files: string[]) => {
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
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid selection",
          message: "No valid media files selected. Please select video, image, or audio files.",
        });
        setCurrentFiles([]);
        setSelectedFileType(null);
        return;
      }

      const processedFiles = files.filter((file) => {
        return checkExtensionType(file) === primaryFileType;
      });

      if (processedFiles.length < files.length) {
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid files in selection",
          message: `Kept ${processedFiles.length} ${primaryFileType} file${processedFiles.length > 1 ? "s" : ""}. ${files.length - processedFiles.length} other file${files.length - processedFiles.length > 1 ? "s" : ""} from your selection were invalid or of a different type and have been discarded.`,
        });
      }

      setCurrentFiles(processedFiles);
      setSelectedFileType(primaryFileType);

      // Initialize default output format and quality based on file type
      const defaultFormat =
        primaryFileType === "image"
          ? (".jpg" as const)
          : primaryFileType === "audio"
            ? (".mp3" as const)
            : (".mp4" as const);

      setOutputFormat(defaultFormat);
      setCurrentQualitySetting(getDefaultQuality(defaultFormat));
    } catch (error) {
      const errorMessage = String(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error processing files",
        message: errorMessage,
      });
      console.error("Error processing files:", errorMessage);
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
        if (!outputFormat || !currentQualitySetting) {
          throw new Error("Output format and quality settings must be configured");
        }

        const outputPath = await convertMedia(item, outputFormat, currentQualitySetting);

        await toast.hide();
        // TODO: Add proper toast success when having multiple files being converted, like "successfully converted 1 file out of 5", etc.
        // Should also handle edge cases, such as when the user is converting a file to something, then converts it again to another:
        // like a queue system for handling multiple files.
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

        // TODO: What's this? AI slop? To check on
        //
        // Check if the error is related to FFmpeg not being installed
        if (errorMessage.includes("FFmpeg is not installed or configured")) {
          showFailureToast(new Error("FFmpeg needs to be configured to convert files"), {
            title: "FFmpeg not found",
            primaryAction: {
              title: "Configure FFmpeg",
              onAction: () => {
                // Open command preferences to set FFmpeg path
                openCommandPreferences();
              },
            },
          });
        } else {
          await showToast({ style: Toast.Style.Failure, title: "Conversion failed", message: errorMessage });
          console.error(`Conversion failed:`, errorMessage);
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
      />
      {selectedFileType && (
        <Form.Dropdown
          id="format"
          title="Select output format"
          value={outputFormat!}
          onChange={(newFormat) => {
            const format = newFormat as AllOutputExtension;
            setOutputFormat(format);
            setCurrentQualitySetting(getDefaultQuality(format));
          }}
        >
          <Form.Dropdown.Section>
            {(() => {
              const availableExtensions =
                selectedFileType === "image"
                  ? OUTPUT_IMAGE_EXTENSIONS
                  : selectedFileType === "audio"
                    ? OUTPUT_AUDIO_EXTENSIONS
                    : OUTPUT_VIDEO_EXTENSIONS;

              /* HEIC is only supported on macOS with SIPS, so we filter it out on other platforms. */
              return availableExtensions
                .filter((format) => process.platform === "darwin" || format !== ".heic")
                .map((format) => <Form.Dropdown.Item key={format} value={format} title={format} />);
            })()}
          </Form.Dropdown.Section>
        </Form.Dropdown>
      )}
      {/* Quality Settings */}
      {selectedFileType && outputFormat && currentQualitySetting && (
        <QualitySettings
          outputFormat={outputFormat}
          currentQuality={currentQualitySetting}
          onQualityChange={setCurrentQualitySetting}
        />
      )}
    </Form>
  );
}

// Quality Settings Component
function QualitySettings({
  outputFormat,
  currentQuality,
  onQualityChange,
}: {
  outputFormat: AllOutputExtension;
  currentQuality: QualitySettings;
  onQualityChange: (quality: QualitySettings) => void;
}) {
  const currentMediaType = getMediaType(outputFormat)!;
  switch (currentMediaType) {
    case "image":
      return (
        <ImageQualitySettings
          outputFormat={outputFormat as OutputImageExtension}
          currentQuality={currentQuality as ImageQuality}
          onQualityChange={onQualityChange as (quality: ImageQuality) => void}
        />
      );
    case "audio":
      return (
        <AudioQualitySettings
          outputFormat={outputFormat as OutputAudioExtension}
          currentQuality={currentQuality as AudioQuality}
          onQualityChange={onQualityChange as (quality: AudioQuality) => void}
        />
      );
    case "video":
    /* return (
       <VideoQualitySettings
         outputFormat={outputFormat as OutputVideoExtension}
         currentQuality={currentQuality as VideoQuality}
         onQualityChange={onQualityChange as (quality: VideoQuality) => void}
       />
     ); */
  }
}

function ImageQualitySettings({
  outputFormat,
  currentQuality,
  onQualityChange,
}: {
  outputFormat: OutputImageExtension;
  currentQuality: ImageQuality;
  onQualityChange: (quality: ImageQuality) => void;
}) {
  const getCurrentValue = () => {
    return currentQuality[outputFormat];
  };

  const handleChange = (value: string | number) => {
    const newQuality = { ...currentQuality } as ImageQuality;
    (newQuality as Record<string, string | number>)[outputFormat] = value;
    onQualityChange(newQuality);
  };

  if (outputFormat === ".png") {
    return (
      <>
        <Form.Dropdown
          id="qualitySetting"
          title="Select quality"
          value={(getCurrentValue() as string) || "png-24"}
          onChange={(value) => handleChange(value)}
        >
          <Form.Dropdown.Item value="png-24" title="PNG-24 (24-bit RGB, full color)" />
          <Form.Dropdown.Item value="png-8" title="PNG-8 (8-bit indexed, 256 colors)" />
        </Form.Dropdown>
        <Form.Description text="PNG-24 is lossless with full color range. PNG-8 uses indexed colors (256 max) for smaller file sizes. FFmpeg's PNG-8 implementation badly handles transparency." />
      </>
    );
  }

  if (outputFormat === ".tiff") {
    return (
      <>
        <Form.Dropdown
          id="qualitySetting"
          title="Select compression type"
          value={(getCurrentValue() as string) || "deflate"}
          onChange={(value) => handleChange(value)}
        >
          <Form.Dropdown.Item value="deflate" title="Deflate (recommended, smaller size)" />
          <Form.Dropdown.Item value="lzw" title="LZW (wider compatibility)" />
        </Form.Dropdown>
        <Form.Description text="Here, TIFF is always lossless." />
      </>
    );
  }

  // For .jpg, .heic, .avif, .webp - use percentage quality
  return (
    <Form.Dropdown
      id="qualitySetting"
      title="Select quality"
      value={(getCurrentValue() as number)?.toString() || "80"}
      onChange={(value) => {
        if (value === "lossless") {
          handleChange("lossless");
        } else {
          handleChange(Number(value));
        }
      }}
    >
      {outputFormat === ".webp" && (
        <Form.Dropdown.Section>
          <Form.Dropdown.Item value="lossless" title="Lossless" />
        </Form.Dropdown.Section>
      )}
      {[...Array(21).keys()]
        .map((i) => (100 - i * 5).toString())
        .map((q) => {
          const title = outputFormat === ".avif" && q === "100" ? "100 (lossless)" : q.toString();
          return <Form.Dropdown.Item key={q} value={q.toString()} title={title} />;
        })}
    </Form.Dropdown>
  );
}

// TODO: If the selected output setting surpasses the quality of the original file, show the input audio's bitrate/profile/sample, which file is that.
// Just a warning, letting the user know that the output file will not be better than the input file.
function AudioQualitySettings({
  outputFormat,
  currentQuality,
  onQualityChange,
}: {
  outputFormat: OutputAudioExtension;
  currentQuality: AudioQuality;
  onQualityChange: (quality: AudioQuality) => void;
}) {
  const getCurrentSettings = () => {
    return currentQuality[outputFormat];
  };

  const updateSettings = (newSettings: unknown) => {
    const newQuality = { ...currentQuality } as AudioQuality;
    (newQuality as Record<string, unknown>)[outputFormat] = newSettings;
    onQualityChange(newQuality);
  };

  // Derive controls from the AudioQuality type structure dynamically
  const controls = Object.keys(getCurrentSettings()) as (keyof AudioQuality[OutputAudioExtension])[];

  return (
    <DynamicAudioQualitySettings
      outputFormat={outputFormat}
      controls={controls}
      settings={getCurrentSettings()}
      onSettingsChange={updateSettings}
    />
  );

  // Note: keep this as a separate function in case we need it for some other reason later
  function DynamicAudioQualitySettings({
    outputFormat,
    controls,
    settings,
    onSettingsChange,
  }: {
    outputFormat: OutputAudioExtension;
    controls: (keyof AudioQuality[OutputAudioExtension])[];
    settings: AudioQuality[OutputAudioExtension];
    onSettingsChange: (settings: AudioQuality[OutputAudioExtension]) => void;
  }) {
    const renderControl = (controlType: keyof AudioQuality[OutputAudioExtension]) => {
      // Type-safe access to current value
      const currentValue = (settings as Record<string, unknown>)?.[controlType as string];

      switch (controlType) {
        case "bitrate":
          return (
            <Form.Dropdown
              key="bitrate"
              id="bitrate"
              title="Bitrate"
              value={(currentValue as AudioBitrate) || "192"}
              onChange={(bitrate: string) => onSettingsChange({ ...settings, [controlType]: bitrate as AudioBitrate })}
              info="Higher bitrates provide better audio quality but larger file sizes"
            >
              {AUDIO_BITRATES.map((rate) => (
                <Form.Dropdown.Item
                  key={rate}
                  value={rate}
                  title={`${rate} kbps${rate === "64" ? " (Very low quality)" : rate === "192" ? " (Regular quality)" : rate === "320" ? " (Very high quality)" : ""}`}
                />
              ))}
            </Form.Dropdown>
          );

        case "vbr":
          return (
            <Form.Checkbox
              key="vbr"
              id="vbr"
              title="Variable Bitrate (VBR)"
              label="Use variable bitrate encoding for better quality"
              value={(currentValue as boolean) || false}
              onChange={(vbr: boolean) => onSettingsChange({ ...settings, [controlType]: vbr })}
              info="VBR adjusts bitrate dynamically, often producing better quality at similar file sizes"
            />
          );

        case "profile":
          return (
            <Form.Dropdown
              key="profile"
              id="profile"
              title="Profile"
              value={(currentValue as AudioProfile) || "aac_low"}
              onChange={(profile: string) => onSettingsChange({ ...settings, [controlType]: profile as AudioProfile })}
              info="Different AAC profiles optimize for various use cases and bitrate ranges"
            >
              {AUDIO_PROFILES.map((profile) => (
                <Form.Dropdown.Item
                  key={profile}
                  value={profile}
                  title={
                    profile === "aac_low"
                      ? "AAC-LC (Low Complexity) - Standard quality"
                      : profile === "aac_he"
                        ? "HE-AAC v1 - High efficiency for lower bitrates"
                        : "HE-AAC v2 - Most efficient for very low bitrates"
                  }
                />
              ))}
            </Form.Dropdown>
          );

        case "sampleRate":
          return (
            <Form.Dropdown
              key="sampleRate"
              id="sampleRate"
              title="Sample Rate"
              value={(currentValue as AudioSampleRate) || "44100"}
              onChange={(sampleRate: string) =>
                onSettingsChange({ ...settings, [controlType]: sampleRate as AudioSampleRate })
              }
              info={
                outputFormat === ".flac"
                  ? "Higher sample rates capture more detail but create larger files"
                  : "FLAC preserves all audio data regardless of sample rate"
              }
            >
              {AUDIO_SAMPLE_RATES.map((rate) => (
                <Form.Dropdown.Item
                  key={rate}
                  value={rate}
                  title={`${rate} Hz (${rate === "22050" ? "Phone quality" : rate === "44100" ? "CD quality" : rate === "48000" ? "DVD/Digital TV quality" : "High-resolution audio"})`}
                />
              ))}
            </Form.Dropdown>
          );

        case "bitDepth":
          return (
            <Form.Dropdown
              key="bitDepth"
              id="bitDepth"
              title="Bit Depth"
              value={(currentValue as AudioBitDepth) || "16"}
              onChange={(bitDepth: string) =>
                onSettingsChange({ ...settings, [controlType]: bitDepth as AudioBitDepth })
              }
              info="Higher bit depths provide greater dynamic range and lower noise floor"
            >
              {AUDIO_BIT_DEPTH.filter((depth) => !(outputFormat === ".flac" && depth === "32")).map((depth) => (
                <Form.Dropdown.Item
                  key={depth}
                  value={depth}
                  title={
                    depth +
                    "-bit (" +
                    (depth === "16" ? "CD quality" : depth === "24" ? "Professional/Hi-Res" : "Professional float") +
                    ")"
                  }
                />
              ))}
            </Form.Dropdown>
          );

        case "compressionLevel":
          return (
            <Form.Dropdown
              key="compressionLevel"
              id="compressionLevel"
              title="Compression Level"
              value={(currentValue as AudioCompressionLevel)?.toString() || "5"}
              onChange={(level: string) =>
                onSettingsChange({ ...settings, [controlType]: level as AudioCompressionLevel })
              }
              info="Higher compression levels reduce file size but take longer to encode"
            >
              {AUDIO_COMPRESSION_LEVEL.map((level) => (
                <Form.Dropdown.Item key={level} value={level} title={`${level}`} />
              ))}
            </Form.Dropdown>
          );

        default:
          return null;
      }
    };

    return <>{controls.map((controlType) => renderControl(controlType))}</>;
  }
}
