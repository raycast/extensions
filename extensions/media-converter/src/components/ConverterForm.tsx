import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  showInFinder,
  Icon,
  openCommandPreferences,
  getPreferenceValues,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { convertMedia } from "../utils/converter";
import {
  OUTPUT_VIDEO_EXTENSIONS,
  OUTPUT_AUDIO_EXTENSIONS,
  OUTPUT_IMAGE_EXTENSIONS,
  type MediaType,
  type AllOutputExtension,
  type QualitySettings,
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
  DEFAULT_VBR_QUALITIES,
  AUDIO_COMPRESSION_LEVEL,
  type AudioCompressionLevel,
  VIDEO_ENCODING_MODES,
  type VideoEncodingMode,
  VIDEO_BITRATE,
  type VideoBitrate,
  VIDEO_PRESET,
  type VideoPreset,
  PRORES_VARIANTS,
  type ProResVariant,
  VP9_QUALITY,
  type VP9Quality,
  AudioControlType,
  AllControlType,
  VideoControlType,
  VideoMaxBitrate,
  VIDEO_MAX_BITRATE,
  type QualityLevel,
  DEFAULT_SIMPLE_QUALITY,
  getDefaultQuality,
} from "../types/media";
import path from "path";
import { execPromise } from "../utils/exec";

export function ConverterForm({ initialFiles = [] }: { initialFiles?: string[] }) {
  const preferences = getPreferenceValues();
  const [selectedFileType, setSelectedFileType] = useState<MediaType | null>(null);
  const [currentFiles, setCurrentFiles] = useState<string[]>(initialFiles || []);
  const [outputFormat, setOutputFormat] = useState<AllOutputExtension | null>(null);
  const [currentQualitySetting, setCurrentQualitySetting] = useState<QualitySettings | null>(null);
  const [simpleQuality, setSimpleQuality] = useState<QualityLevel>(DEFAULT_SIMPLE_QUALITY);

  const [isLoading, setIsLoading] = useState(true);

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
      let primaryFileType: MediaType | null = null;
      for (const file of files) {
        if (path.extname(file) === ".heic" && process.platform !== "darwin") {
          continue; // Skip .heic files when not on macOS.
          // TODO: implement SharpJS, solve this state.
        }
        const type = getMediaType(path.extname(file));
        if (type) {
          primaryFileType = type as MediaType;
          break; // Found the first valid file type
        }
      }

      if (!primaryFileType) {
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid selection",
          message: "No valid media files selected. Please select video, image, or audio files.",
          secondaryAction: {
            title: "See supported formats",
            shortcut: { modifiers: ["cmd"], key: "o" },
            onAction: () => {
              execPromise(
                "open https://www.raycast.com/leandro.maia/media-converter#:~:text=supported%20input%20formats",
              );
            },
          },
        });
        setCurrentFiles([]);
        setSelectedFileType(null);
        return;
      }

      const processedFiles = files.filter((file) => {
        return getMediaType(path.extname(file)) === primaryFileType;
      });

      if (processedFiles.length < files.length) {
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid files in selection",
          message: `Kept ${processedFiles.length} ${primaryFileType} file${processedFiles.length > 1 ? "s" : ""}. ${files.length - processedFiles.length} other file${files.length - processedFiles.length > 1 ? "s" : ""} from your selection were invalid or of a different type and have been discarded.`,
          secondaryAction: {
            title: "See supported formats",
            shortcut: { modifiers: ["cmd"], key: "o" },
            onAction: () => {
              execPromise(
                "open https://www.raycast.com/leandro.maia/media-converter#:~:text=supported%20input%20formats",
              );
            },
          },
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

      if (preferences.moreConversionSettings || primaryFileType === "image") {
        setCurrentQualitySetting(getDefaultQuality(defaultFormat, preferences));
      } else {
        setCurrentQualitySetting(getDefaultQuality(defaultFormat, preferences, DEFAULT_SIMPLE_QUALITY));
      }
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

        // In theory, this should never happen
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
            if (preferences.moreConversionSettings || selectedFileType === "image") {
              setCurrentQualitySetting(getDefaultQuality(format, preferences));
            } else {
              // Update quality settings based on current simple quality level
              setCurrentQualitySetting(getDefaultQuality(format, preferences, DEFAULT_SIMPLE_QUALITY));
            }
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
        <>
          {preferences.moreConversionSettings || selectedFileType === "image" ? (
            <QualitySettingsComponent
              outputFormat={outputFormat}
              currentQuality={currentQualitySetting}
              onQualityChange={setCurrentQualitySetting}
            />
          ) : (
            <Form.Dropdown
              id="simpleQuality"
              title="Quality"
              value={simpleQuality}
              onChange={(newQuality) => {
                const quality = newQuality as QualityLevel;
                setSimpleQuality(quality);
                setCurrentQualitySetting(getDefaultQuality(outputFormat!, preferences, quality));
              }}
              info="Choose the quality level for your converted file"
            >
              <Form.Dropdown.Item value="lowest" title="Lowest (smallest file size)" />
              <Form.Dropdown.Item value="low" title="Low" />
              <Form.Dropdown.Item value="medium" title="Medium" />
              <Form.Dropdown.Item value="high" title="High (recommended)" />
              <Form.Dropdown.Item value="highest" title="Highest (largest file size)" />
            </Form.Dropdown>
          )}
        </>
      )}
    </Form>
  );
}

// TODO: If the selected output setting surpasses the quality of the original file, show the input audio's bitrate/profile/sample, which file is that.
// Just a warning, letting the user know that the output file will not be better than the input file.

function QualitySettingsComponent({
  outputFormat,
  currentQuality,
  onQualityChange,
}: {
  outputFormat: AllOutputExtension;
  currentQuality: QualitySettings;
  onQualityChange: (quality: QualitySettings) => void;
}) {
  const currentMediaType = getMediaType(outputFormat)!;

  const getCurrentSettings = () => {
    return (currentQuality as Record<string, unknown>)[outputFormat];
  };

  const updateSettings = (newSettings: unknown) => {
    const newQuality = { ...currentQuality } as QualitySettings;
    (newQuality as Record<string, unknown>)[outputFormat] = newSettings;
    onQualityChange(newQuality);
  };

  switch (currentMediaType) {
    case "image": {
      return (
        <DynamicQualitySettings
          outputFormat={outputFormat}
          mediaType="image"
          settings={getCurrentSettings()}
          onSettingsChange={updateSettings}
        />
      );
    }
    case "audio": {
      // Derive controls from the AudioQuality type structure dynamically
      const audioSettings = getCurrentSettings() as Record<string, unknown>;
      const audioControls = Object.keys(audioSettings || {});
      return (
        <DynamicQualitySettings
          outputFormat={outputFormat}
          mediaType="audio"
          controls={audioControls}
          settings={audioSettings}
          onSettingsChange={updateSettings}
        />
      );
    }
    case "video": {
      // Derive controls from the VideoQuality type structure dynamically
      const videoSettings = getCurrentSettings() as Record<string, unknown>;
      const videoControls = Object.keys(videoSettings || {});
      return (
        <DynamicQualitySettings
          outputFormat={outputFormat}
          mediaType="video"
          controls={videoControls}
          settings={videoSettings}
          onSettingsChange={updateSettings}
        />
      );
    }
  }

  function DynamicQualitySettings({
    outputFormat,
    mediaType,
    controls,
    settings,
    onSettingsChange,
  }: {
    outputFormat: AllOutputExtension;
    mediaType: MediaType;
    controls?: string[];
    settings: unknown;
    onSettingsChange: (settings: unknown) => void;
  }) {
    // Handle image quality settings (simpler, non-object based)
    if (mediaType === "image") {
      const handleImageChange = (value: string | number) => {
        onSettingsChange(value);
      };

      if (outputFormat === ".png") {
        return (
          <>
            <Form.Dropdown
              id="qualitySetting"
              title="Select quality"
              value={settings as string}
              onChange={(value) => handleImageChange(value)}
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
              value={settings as string}
              onChange={(value) => handleImageChange(value)}
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
          value={(settings as number)?.toString()}
          onChange={(value) => {
            if (value === "lossless") {
              handleImageChange("lossless");
            } else {
              handleImageChange(Number(value));
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

    // Handle audio and video quality settings (object-based)

    const renderControl = (controlType: AllControlType) => {
      // Type-safe access to current value
      const settingsObj = settings as Record<string, unknown>;
      const currentValue = settingsObj?.[controlType];

      // Audio controls
      if (mediaType === "audio") {
        controlType = controlType as AudioControlType;
        switch (controlType) {
          case "bitrate":
            return (
              <Form.Dropdown
                key="bitrate"
                id="bitrate"
                title="Bitrate"
                value={currentValue as AudioBitrate}
                onChange={(bitrate: string) =>
                  onSettingsChange({ ...settingsObj, [controlType]: bitrate as AudioBitrate })
                }
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
                value={currentValue as boolean}
                onChange={(vbr: boolean) => onSettingsChange({ ...settingsObj, [controlType]: vbr })}
                info="VBR adjusts bitrate dynamically, often producing better quality at similar file sizes"
              />
            );

          case "profile":
            return (
              <Form.Dropdown
                key="profile"
                id="profile"
                title="Profile"
                value={currentValue as AudioProfile}
                onChange={(profile: string) =>
                  onSettingsChange({ ...settingsObj, [controlType]: profile as AudioProfile })
                }
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
                value={currentValue as AudioSampleRate}
                onChange={(sampleRate: string) =>
                  onSettingsChange({ ...settingsObj, [controlType]: sampleRate as AudioSampleRate })
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
                value={currentValue as AudioBitDepth}
                onChange={(bitDepth: string) =>
                  onSettingsChange({ ...settingsObj, [controlType]: bitDepth as AudioBitDepth })
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
                value={(currentValue as AudioCompressionLevel)?.toString()}
                onChange={(level: string) =>
                  onSettingsChange({ ...settingsObj, [controlType]: level as AudioCompressionLevel })
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
      }

      // Video controls
      if (mediaType === "video") {
        controlType = controlType as VideoControlType;
        switch (controlType) {
          case "encodingMode":
            return (
              <Form.Dropdown
                key="encodingMode"
                id="encodingMode"
                title="Encoding Mode"
                value={currentValue as VideoEncodingMode}
                onChange={(mode: string) => {
                  const newMode = mode as VideoEncodingMode;

                  // Reset settings based on new encoding mode and format
                  if (outputFormat === ".mov") {
                    // MOV only has variant, no encoding mode
                    return;
                  } else if (newMode === "crf") {
                    // Use CRF defaults from DEFAULT_QUALITIES
                    const newSettings = DEFAULT_QUALITIES[outputFormat];
                    onSettingsChange(newSettings);
                  } else {
                    // Use VBR defaults from DEFAULT_VBR_QUALITIES, but update encoding mode
                    const vbrDefault = DEFAULT_VBR_QUALITIES[outputFormat as keyof typeof DEFAULT_VBR_QUALITIES];
                    const newSettings = { ...vbrDefault, encodingMode: newMode };
                    onSettingsChange(newSettings);
                  }
                }}
                info="CRF provides constant visual quality, VBR uses variable bitrate for target file size"
              >
                {VIDEO_ENCODING_MODES.map((mode) => (
                  <Form.Dropdown.Item
                    key={mode}
                    value={mode}
                    title={
                      mode === "crf"
                        ? "CRF (Constant Rate Factor) - Quality-based"
                        : mode === "vbr"
                          ? "VBR (Variable Bitrate)"
                          : "VBR 2-Pass - Better quality, 2× slower"
                    }
                  />
                ))}
              </Form.Dropdown>
            );

          case "crf":
            return (
              <Form.Dropdown
                key="crf"
                id="crf"
                title="Quality"
                value={(currentValue as number)?.toString()}
                onChange={(quality: string) => onSettingsChange({ ...settingsObj, [controlType]: parseInt(quality) })}
                info="Higher values = better quality, larger files"
              >
                {[...Array(21).keys()]
                  .map((i) => (100 - i * 5).toString())
                  .map((q) => (
                    <Form.Dropdown.Item key={q} value={q} title={`${q}`} />
                  ))}
              </Form.Dropdown>
            );

          case "bitrate":
            return (
              <Form.Dropdown
                key="bitrate"
                id="bitrate"
                title="Bitrate"
                value={currentValue as VideoBitrate}
                onChange={(bitrate: string) =>
                  onSettingsChange({ ...settingsObj, [controlType]: bitrate as VideoBitrate })
                }
                info="Target bitrate in kbps. Higher values provide better quality but larger files."
              >
                {VIDEO_BITRATE.map((rate) => (
                  <Form.Dropdown.Item key={rate} value={rate} title={`${rate} kbps`} />
                ))}
              </Form.Dropdown>
            );

          case "maxBitrate":
            return (
              <Form.Dropdown
                key="maxBitrate"
                id="maxBitrate"
                title="Max Bitrate"
                value={currentValue as VideoMaxBitrate}
                onChange={(maxBitrate: string) =>
                  onSettingsChange({ ...settingsObj, [controlType]: maxBitrate as VideoMaxBitrate })
                }
                info="Optional maximum bitrate limit. Leave empty for no limit."
              >
                {VIDEO_MAX_BITRATE.filter((rate) => {
                  if (rate === "") return true;

                  const currentBitrate = settingsObj?.bitrate as VideoBitrate;
                  if (!currentBitrate) return true;

                  return parseInt(rate) >= parseInt(currentBitrate);
                }).map((rate) => (
                  <Form.Dropdown.Item key={rate} value={rate} title={`${rate === "" ? "No limit" : rate + " kbps"}`} />
                ))}
              </Form.Dropdown>
            );

          case "preset":
            return (
              <Form.Dropdown
                key="preset"
                id="preset"
                title="Encoding Preset"
                value={currentValue as VideoPreset}
                onChange={(preset: string) =>
                  onSettingsChange({ ...settingsObj, [controlType]: preset as VideoPreset })
                }
                info="Balance between encoding speed and compression efficiency"
              >
                {VIDEO_PRESET.map((preset) => (
                  <Form.Dropdown.Item
                    key={preset}
                    value={preset}
                    title={`${preset}${
                      (preset as VideoPreset) === "ultrafast"
                        ? " (Fastest, large files)"
                        : preset === "medium"
                          ? " (Balanced)"
                          : preset === "veryslow"
                            ? " (Slowest, small files)"
                            : ""
                    }`}
                  />
                ))}
              </Form.Dropdown>
            );

          case "variant":
            return (
              <Form.Dropdown
                key="variant"
                id="variant"
                title="ProRes Variant"
                value={currentValue as ProResVariant}
                onChange={(variant: string) =>
                  onSettingsChange({ ...settingsObj, [controlType]: variant as ProResVariant })
                }
                info="ProRes quality variants, from proxy (smallest) to 4444XQ (highest quality)"
              >
                {PRORES_VARIANTS.map((variant) => (
                  <Form.Dropdown.Item
                    key={variant}
                    value={variant}
                    title={
                      variant === "proxy"
                        ? "Proxy (Lowest quality, smallest size)"
                        : variant === "lt"
                          ? "LT (Low quality)"
                          : variant === "standard"
                            ? "Standard (Normal quality)"
                            : variant === "hq"
                              ? "HQ (High quality)"
                              : variant === "4444"
                                ? "4444 (Highest quality with alpha)"
                                : "4444 XQ (Maximum quality with alpha)"
                    }
                  />
                ))}
              </Form.Dropdown>
            );

          case "quality":
            return (
              <Form.Dropdown
                key="quality"
                id="quality"
                title="VP9 Quality"
                value={currentValue as VP9Quality}
                onChange={(quality: string) =>
                  onSettingsChange({ ...settingsObj, [controlType]: quality as VP9Quality })
                }
                info="VP9 encoding quality vs speed tradeoff"
              >
                {VP9_QUALITY.map((quality) => (
                  <Form.Dropdown.Item
                    key={quality}
                    value={quality}
                    title={
                      quality === "realtime"
                        ? "Realtime (Fastest, lower quality)"
                        : quality === "good"
                          ? "Good (Balanced)"
                          : "Best (Slowest, highest quality)"
                    }
                  />
                ))}
              </Form.Dropdown>
            );

          default:
            return null;
        }
      }

      return null;
    };

    return <>{controls!.map((controlType) => renderControl(controlType as AllControlType))}</>;
  }
}
