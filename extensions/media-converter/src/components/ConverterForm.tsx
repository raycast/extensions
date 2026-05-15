import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  getPreferenceValues,
  Clipboard,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect, useMemo, useRef } from "react";
import fs from "fs";
import path from "path";
import { convertMedia } from "../utils/converter";
import { runConversionBatch } from "../utils/convertBatch";
import { parseTimeString, formatTimeString } from "../utils/time";
import { getAllPresets, findPreset } from "../utils/presets";
import { PresetEditorForm } from "./PresetEditorForm";
import { execPromise } from "../utils/exec";
import {
  OUTPUT_VIDEO_EXTENSIONS,
  OUTPUT_AUDIO_EXTENSIONS,
  OUTPUT_IMAGE_EXTENSIONS,
  OUTPUT_GIF_EXTENSIONS,
  type MediaType,
  type AllOutputExtension,
  type OutputVideoExtension,
  type OutputImageExtension,
  type OutputAudioExtension,
  type QualitySettings,
  type Preset,
  type TrimOptions,
  type GifFps,
  type GifWidth,
  GIF_FPS,
  GIF_WIDTH,
  getMediaType,
  getOutputCategory,
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
  ALLOWED_VIDEO_ENCODING_MODES,
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

type LaunchContext = {
  prefill?: {
    inputs?: string[];
    outputFormat?: AllOutputExtension;
    quality?: QualitySettings;
    trim?: TrimOptions;
    stripMetadata?: boolean;
    outputDir?: string;
  };
};

export function ConverterForm({
  initialFiles = [],
  launchContext,
}: {
  initialFiles?: string[];
  launchContext?: LaunchContext;
} = {}) {
  const preferences = getPreferenceValues<Preferences>();
  const prefill = launchContext?.prefill;
  const initialInputFiles = prefill?.inputs ?? initialFiles ?? [];
  const initialInputKey = initialInputFiles.join("\0");

  const [selectedFileType, setSelectedFileType] = useState<MediaType | null>(null);
  const [currentFiles, setCurrentFiles] = useState<string[]>(initialInputFiles);
  const [outputFormat, setOutputFormat] = useState<AllOutputExtension | null>(prefill?.outputFormat ?? null);
  const [currentQualitySetting, setCurrentQualitySetting] = useState<QualitySettings | null>(prefill?.quality ?? null);
  const [simpleQuality, setSimpleQuality] = useState<QualityLevel>(DEFAULT_SIMPLE_QUALITY);
  const [presetId, setPresetId] = useState<string>("");
  const [presets, setPresets] = useState<Preset[]>([]);
  const [trimStart, setTrimStart] = useState<string>(prefill?.trim?.start ?? "");
  const [trimEnd, setTrimEnd] = useState<string>(prefill?.trim?.end ?? "");
  const [stripMetadata, setStripMetadata] = useState<boolean>(
    prefill?.stripMetadata ?? Boolean(preferences.defaultStripMetadata),
  );
  const [outputLocationMode, setOutputLocationMode] = useState<"sameAsInput" | "customFolder" | "thisRun">(
    prefill?.outputDir
      ? "thisRun"
      : ((preferences.defaultOutputLocation as "sameAsInput" | "customFolder") ?? "sameAsInput"),
  );
  const [customOutputFolderOverride, setCustomOutputFolderOverride] = useState<string>(prefill?.outputDir ?? "");

  const [isLoading, setIsLoading] = useState(true);
  const appliedInitialInputKey = useRef<string | null>(null);
  const hasUserSelectedFiles = useRef(false);
  const { push } = useNavigation();

  useEffect(() => {
    (async () => {
      try {
        const all = await getAllPresets();
        setPresets(all);
      } catch (err) {
        console.warn("Failed to load presets:", err);
      }
    })();
  }, []);

  useEffect(() => {
    if (initialInputFiles.length === 0) {
      if (appliedInitialInputKey.current === null) {
        appliedInitialInputKey.current = initialInputKey;
        setCurrentFiles([]);
      }
      setIsLoading(false);
      return;
    }

    if (hasUserSelectedFiles.current || appliedInitialInputKey.current === initialInputKey) {
      return;
    }

    appliedInitialInputKey.current = initialInputKey;
    handleFileSelect(initialInputFiles);
  }, [initialInputKey]);

  const handleFileSelect = (files: string[], options: { markAsUserSelection?: boolean } = {}) => {
    if (options.markAsUserSelection) {
      hasUserSelectedFiles.current = true;
    }

    if (files.length === 0) {
      setCurrentFiles([]);
      setSelectedFileType(null);
      setIsLoading(false);
      return;
    }

    try {
      let primaryFileType: MediaType | null = null;
      for (const file of files) {
        if (path.extname(file) === ".heic" && process.platform !== "darwin") {
          continue;
        }
        const type = getMediaType(path.extname(file));
        if (type) {
          primaryFileType = type as MediaType;
          break;
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
        setIsLoading(false);
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
        });
      }

      setCurrentFiles(processedFiles);
      setSelectedFileType(primaryFileType);

      // If a prefill provided output format, respect it and skip default reset.
      if (prefill?.outputFormat && prefill?.quality) {
        setOutputFormat(prefill.outputFormat);
        setCurrentQualitySetting(prefill.quality);
        setIsLoading(false);
        return;
      }

      const preferredImageFormat = preferences.defaultImageOutputFormat as OutputImageExtension | undefined;
      const sanitizedImageFormat =
        process.platform !== "darwin" && preferredImageFormat === ".heic" ? ".jpg" : preferredImageFormat;
      const defaultImageFormat =
        sanitizedImageFormat && OUTPUT_IMAGE_EXTENSIONS.includes(sanitizedImageFormat)
          ? sanitizedImageFormat
          : (".jpg" as const);

      const preferredVideoFormat = preferences.defaultVideoOutputFormat as OutputVideoExtension | undefined;
      const defaultVideoFormat =
        preferredVideoFormat && OUTPUT_VIDEO_EXTENSIONS.includes(preferredVideoFormat)
          ? preferredVideoFormat
          : (".mp4" as const);

      const preferredAudioFormat = preferences.defaultAudioOutputFormat as OutputAudioExtension | undefined;
      const defaultAudioFormat =
        preferredAudioFormat && OUTPUT_AUDIO_EXTENSIONS.includes(preferredAudioFormat)
          ? preferredAudioFormat
          : (".mp3" as const);

      const defaultFormat =
        primaryFileType === "image"
          ? defaultImageFormat
          : primaryFileType === "audio"
            ? defaultAudioFormat
            : (defaultVideoFormat as AllOutputExtension);

      setOutputFormat(defaultFormat);

      if (preferences.moreConversionSettings || primaryFileType === "image") {
        setCurrentQualitySetting(getDefaultQuality(defaultFormat, preferences));
      } else {
        if (primaryFileType === "video") {
          const defaultVideoQuality =
            (preferences.defaultVideoQualityPreset as QualityLevel | undefined) ?? DEFAULT_SIMPLE_QUALITY;
          setSimpleQuality(defaultVideoQuality);
          setCurrentQualitySetting(getDefaultQuality(defaultFormat, preferences, defaultVideoQuality));
        } else if (primaryFileType === "audio") {
          const defaultAudioQuality =
            (preferences.defaultAudioQualityPreset as QualityLevel | undefined) ?? DEFAULT_SIMPLE_QUALITY;
          setSimpleQuality(defaultAudioQuality);
          setCurrentQualitySetting(getDefaultQuality(defaultFormat, preferences, defaultAudioQuality));
        } else {
          setSimpleQuality(DEFAULT_SIMPLE_QUALITY);
          setCurrentQualitySetting(getDefaultQuality(defaultFormat, preferences, DEFAULT_SIMPLE_QUALITY));
        }
      }
    } catch (error) {
      const errorMessage = String(error);
      showToast({ style: Toast.Style.Failure, title: "Error processing files", message: errorMessage });
      console.error("Error processing files:", errorMessage);
      setCurrentFiles([]);
      setSelectedFileType(null);
    }

    setIsLoading(false);
  };

  const resolvedOutputDir = useMemo<string | undefined>(() => {
    if (outputLocationMode === "thisRun") {
      return customOutputFolderOverride.trim() || undefined;
    }
    if (outputLocationMode === "customFolder") {
      const configured = (preferences.customOutputFolder as string | undefined)?.trim();
      return configured || undefined;
    }
    return undefined; // same as input
  }, [outputLocationMode, customOutputFolderOverride, preferences.customOutputFolder]);

  const parsedTrim = useMemo<TrimOptions | undefined>(() => {
    const startSec = parseTimeString(trimStart);
    const endSec = parseTimeString(trimEnd);
    if (startSec === null && endSec === null) return undefined;
    return { start: trimStart, end: trimEnd };
  }, [trimStart, trimEnd]);

  const trimValidationHint = useMemo<string>(() => {
    if (!trimStart && !trimEnd) return "";
    const startOk = trimStart === "" || parseTimeString(trimStart) !== null;
    const endOk = trimEnd === "" || parseTimeString(trimEnd) !== null;
    if (!startOk) return "Start time is not a valid HH:MM:SS or seconds value";
    if (!endOk) return "End time is not a valid HH:MM:SS or seconds value";
    const s = parseTimeString(trimStart);
    const e = parseTimeString(trimEnd);
    if (s !== null && e !== null && s >= e) return "End time must be after start time";
    if (s !== null && e !== null) return `Will keep ${formatTimeString(e - s)} of video`;
    if (s !== null) return `Will skip the first ${formatTimeString(s)}`;
    if (e !== null) return `Will keep only the first ${formatTimeString(e)}`;
    return "";
  }, [trimStart, trimEnd]);

  const handleSubmit = async () => {
    if (!outputFormat || !currentQualitySetting) return;

    // Validate trim
    const startOk = trimStart === "" || parseTimeString(trimStart) !== null;
    const endOk = trimEnd === "" || parseTimeString(trimEnd) !== null;
    if (!startOk || !endOk) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid trim values", message: trimValidationHint });
      return;
    }

    // Validate output folder if custom
    if (resolvedOutputDir) {
      try {
        const stat = fs.statSync(resolvedOutputDir);
        if (!stat.isDirectory()) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Output folder is not a directory",
            message: resolvedOutputDir,
          });
          return;
        }
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Output folder does not exist",
          message: resolvedOutputDir,
        });
        return;
      }
    }

    setIsLoading(true);
    try {
      await runConversionBatch(currentFiles, {
        outputFormat,
        quality: currentQualitySetting,
        outputDir: resolvedOutputDir,
        stripMetadata,
        trim: parsedTrim,
        showProgress: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onPresetChange = async (id: string) => {
    setPresetId(id);
    if (!id) return;
    const preset = await findPreset(id);
    if (!preset) return;
    setOutputFormat(preset.outputFormat);
    setCurrentQualitySetting(preset.quality);
    if (preset.trim) {
      setTrimStart(preset.trim.start ?? "");
      setTrimEnd(preset.trim.end ?? "");
    }
    if (typeof preset.stripMetadata === "boolean") setStripMetadata(preset.stripMetadata);
    if (preset.outputDir) {
      setOutputLocationMode("thisRun");
      setCustomOutputFolderOverride(preset.outputDir);
    }
  };

  const saveAsPresetAction = (
    <Action
      title="Save Settings as Preset…"
      icon={Icon.Stars}
      shortcut={{ modifiers: ["cmd"], key: "s" }}
      onAction={() => {
        if (!outputFormat || !currentQualitySetting || !selectedFileType) return;
        push(
          <PresetEditorForm
            mode="create"
            seed={{
              mediaType: getOutputCategory(outputFormat) === "gif" ? "gif" : selectedFileType,
              outputFormat,
              quality: currentQualitySetting,
              trim: parsedTrim,
              stripMetadata,
              outputDir: resolvedOutputDir,
            }}
            onSaved={async () => {
              const refreshed = await getAllPresets();
              setPresets(refreshed);
            }}
          />,
        );
      }}
    />
  );

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {currentFiles && currentFiles.length > 0 && selectedFileType && (
            <>
              <Action.SubmitForm title="Convert" onSubmit={handleSubmit} icon={Icon.NewDocument} />
              {saveAsPresetAction}
              <Action
                title="Copy FFmpeg Command"
                icon={Icon.Clipboard}
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "c" },
                  windows: { modifiers: ["ctrl", "shift"], key: "c" },
                }}
                onAction={async () => {
                  if (!outputFormat || !currentQualitySetting) return;
                  try {
                    const command = await convertMedia(currentFiles[0], outputFormat, currentQualitySetting, {
                      returnCommandString: true,
                      outputDir: resolvedOutputDir,
                      stripMetadata,
                      trim: parsedTrim,
                    });
                    await Clipboard.copy(command);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Command copied to clipboard",
                      message: currentFiles.length > 1 ? "Command for the first file copied" : "FFmpeg command copied",
                    });
                  } catch (error) {
                    showFailureToast(error, { title: "Failed to generate command" });
                  }
                }}
              />
            </>
          )}
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="selectFiles"
        title="Select files"
        allowMultipleSelection={true}
        value={currentFiles}
        onChange={(newFiles) => handleFileSelect(newFiles, { markAsUserSelection: true })}
      />

      {selectedFileType && presets.length > 0 && (
        <Form.Dropdown id="preset" title="Preset" value={presetId} onChange={onPresetChange}>
          <Form.Dropdown.Item value="" title="— None —" />
          <Form.Dropdown.Section title="Built-in">
            {presets
              .filter((p) => p.builtIn && presetMatchesFileType(p, selectedFileType))
              .map((p) => (
                <Form.Dropdown.Item key={p.id} value={p.id} title={p.name} />
              ))}
          </Form.Dropdown.Section>
          <Form.Dropdown.Section title="My Presets">
            {presets
              .filter((p) => !p.builtIn && presetMatchesFileType(p, selectedFileType))
              .map((p) => (
                <Form.Dropdown.Item key={p.id} value={p.id} title={p.name} />
              ))}
          </Form.Dropdown.Section>
        </Form.Dropdown>
      )}

      {selectedFileType && (
        <Form.Dropdown
          id="format"
          title="Select output format"
          value={outputFormat!}
          onChange={(newFormat) => {
            const format = newFormat as AllOutputExtension;
            setOutputFormat(format);
            if (preferences.moreConversionSettings || selectedFileType === "image" || format === ".gif") {
              setCurrentQualitySetting(getDefaultQuality(format, preferences));
            } else {
              setCurrentQualitySetting(getDefaultQuality(format, preferences, simpleQuality));
            }
          }}
        >
          <Form.Dropdown.Section>
            {(() => {
              const availableExtensions: readonly AllOutputExtension[] =
                selectedFileType === "image"
                  ? OUTPUT_IMAGE_EXTENSIONS
                  : selectedFileType === "audio"
                    ? OUTPUT_AUDIO_EXTENSIONS
                    : ([...OUTPUT_VIDEO_EXTENSIONS, ...OUTPUT_GIF_EXTENSIONS] as const);

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
          {outputFormat === ".gif" ? (
            <GifQualityControls
              settings={currentQualitySetting as { ".gif": { fps: GifFps; width: GifWidth; loop: boolean } }}
              onChange={(s) => setCurrentQualitySetting(s)}
            />
          ) : preferences.moreConversionSettings || selectedFileType === "image" ? (
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

      {/* Trim (video/audio/gif only) */}
      {selectedFileType && (selectedFileType === "video" || selectedFileType === "audio") && (
        <>
          <Form.Separator />
          <Form.Description title="Trim (optional)" text="Leave empty to keep the full duration." />
          <Form.TextField
            id="trimStart"
            title="Start"
            placeholder="e.g. 0:10 or 10.5"
            value={trimStart}
            onChange={setTrimStart}
          />
          <Form.TextField
            id="trimEnd"
            title="End"
            placeholder="e.g. 1:30 or 90"
            value={trimEnd}
            onChange={setTrimEnd}
          />
          {trimValidationHint && <Form.Description text={trimValidationHint} />}
          {currentFiles.length > 1 && parsedTrim && (
            <Form.Description text={`Trim will be applied to all ${currentFiles.length} files.`} />
          )}
        </>
      )}

      {/* Output location + metadata */}
      {selectedFileType && (
        <>
          <Form.Separator />
          <Form.Dropdown
            id="outputLocation"
            title="Save to"
            value={outputLocationMode}
            onChange={(v) => setOutputLocationMode(v as typeof outputLocationMode)}
          >
            <Form.Dropdown.Item value="sameAsInput" title="Same folder as input" />
            <Form.Dropdown.Item
              value="customFolder"
              title={
                preferences.customOutputFolder
                  ? `Preference folder (${preferences.customOutputFolder})`
                  : "Preference folder (not set)"
              }
            />
            <Form.Dropdown.Item value="thisRun" title="Choose for this run…" />
          </Form.Dropdown>
          {outputLocationMode === "thisRun" && (
            <Form.TextField
              id="customOutputFolderOverride"
              title="Output folder"
              placeholder="/absolute/path/to/folder"
              value={customOutputFolderOverride}
              onChange={setCustomOutputFolderOverride}
            />
          )}
          <Form.Checkbox
            id="stripMetadata"
            title="Privacy"
            label="Strip metadata (EXIF, GPS, tags)"
            value={stripMetadata}
            onChange={setStripMetadata}
          />
        </>
      )}
    </Form>
  );
}

function presetMatchesFileType(preset: Preset, fileType: MediaType): boolean {
  if (fileType === "video") return preset.mediaType === "video" || preset.mediaType === "gif";
  return preset.mediaType === fileType;
}

export function GifQualityControls({
  settings,
  onChange,
}: {
  settings: { ".gif": { fps: GifFps; width: GifWidth; loop: boolean } };
  onChange: (next: QualitySettings) => void;
}) {
  const gif = settings[".gif"];
  return (
    <>
      <Form.Dropdown
        id="gifFps"
        title="FPS"
        value={gif.fps}
        onChange={(v) => onChange({ ".gif": { ...gif, fps: v as GifFps } } as QualitySettings)}
        info="Higher frame rates look smoother but produce larger files"
      >
        {GIF_FPS.map((fps) => (
          <Form.Dropdown.Item key={fps} value={fps} title={`${fps} fps`} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="gifWidth"
        title="Width"
        value={gif.width}
        onChange={(v) => onChange({ ".gif": { ...gif, width: v as GifWidth } } as QualitySettings)}
        info="Smaller widths produce smaller GIFs. Height scales proportionally."
      >
        {GIF_WIDTH.map((w) => (
          <Form.Dropdown.Item key={w} value={w} title={w === "original" ? "Original" : `${w}px`} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox
        id="gifLoop"
        title="Loop"
        label="Play forever (loop)"
        value={gif.loop}
        onChange={(v) => onChange({ ".gif": { ...gif, loop: v } } as QualitySettings)}
      />
    </>
  );
}

// TODO: If the selected output setting surpasses the quality of the original file, show the input audio's bitrate/profile/sample, which file is that.
// Just a warning, letting the user know that the output file will not be better than the input file.

export function QualitySettingsComponent({
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

    const renderControl = (controlType: AllControlType) => {
      const settingsObj = settings as Record<string, unknown>;
      const currentValue = settingsObj?.[controlType];

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

                  if (outputFormat === ".mov") {
                    return;
                  } else if (newMode === "crf") {
                    const newSettings = DEFAULT_QUALITIES[outputFormat as keyof typeof DEFAULT_QUALITIES];
                    onSettingsChange(newSettings);
                  } else {
                    const vbrDefault = DEFAULT_VBR_QUALITIES[outputFormat as keyof typeof DEFAULT_VBR_QUALITIES];
                    const newSettings = { ...vbrDefault, encodingMode: newMode };
                    onSettingsChange(newSettings);
                  }
                }}
                info="CRF provides constant visual quality, VBR uses variable bitrate for target file size"
              >
                {(ALLOWED_VIDEO_ENCODING_MODES[outputFormat as OutputVideoExtension] || []).map((mode) => (
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
                id="videoEncodingPreset"
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
