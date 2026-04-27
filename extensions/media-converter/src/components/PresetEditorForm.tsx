import { useEffect, useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, useNavigation, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { saveUserPreset } from "../utils/presets";
import {
  Preset,
  AllOutputExtension,
  QualitySettings,
  MediaType,
  TrimOptions,
  OUTPUT_IMAGE_EXTENSIONS,
  OUTPUT_AUDIO_EXTENSIONS,
  OUTPUT_VIDEO_EXTENSIONS,
  OUTPUT_GIF_EXTENSIONS,
  getDefaultQuality,
  getOutputCategory,
  GifFps,
  GifWidth,
} from "../types/media";
import { parseTimeString, formatTimeString } from "../utils/time";
import { GifQualityControls, QualitySettingsComponent } from "./ConverterForm";

export type PresetEditorSeed = {
  name?: string;
  description?: string;
  mediaType?: MediaType | "gif";
  outputFormat?: AllOutputExtension;
  quality?: QualitySettings;
  stripMetadata?: boolean;
  trim?: TrimOptions;
  outputDir?: string;
};

export type PresetEditorMode = { mode: "create"; seed?: PresetEditorSeed } | { mode: "edit"; preset: Preset };

export function PresetEditorForm({ onSaved, ...rest }: { onSaved: () => Promise<void> | void } & PresetEditorMode) {
  const preferences = getPreferenceValues();
  const { pop } = useNavigation();

  const editing = rest.mode === "edit" ? rest.preset : null;
  const seed = rest.mode === "create" ? rest.seed : undefined;

  const initialMediaType = editing?.mediaType ?? seed?.mediaType ?? "video";
  const initialOutputFormat = editing?.outputFormat ?? seed?.outputFormat ?? ".mp4";
  const initialQuality =
    editing?.quality ?? seed?.quality ?? getDefaultQuality(initialOutputFormat, preferences, "high");

  const [name, setName] = useState(editing?.name ?? seed?.name ?? "");
  const [description, setDescription] = useState(editing?.description ?? seed?.description ?? "");
  const [mediaType, setMediaType] = useState<MediaType | "gif">(initialMediaType);
  const [outputFormat, setOutputFormat] = useState<AllOutputExtension>(initialOutputFormat);
  const [quality, setQuality] = useState<QualitySettings>(initialQuality);
  const [stripMetadata, setStripMetadata] = useState<boolean>(editing?.stripMetadata ?? seed?.stripMetadata ?? false);
  const [trimStart, setTrimStart] = useState(editing?.trim?.start ?? seed?.trim?.start ?? "");
  const [trimEnd, setTrimEnd] = useState(editing?.trim?.end ?? seed?.trim?.end ?? "");
  const [outputDir, setOutputDir] = useState(editing?.outputDir ?? seed?.outputDir ?? "");

  const formats = formatsForMediaType(mediaType);
  const outputCategory = getOutputCategory(outputFormat);
  const supportsTrim = outputCategory === "video" || outputCategory === "audio" || outputCategory === "gif";

  useEffect(() => {
    const first = formats[0];
    if (first && !formats.includes(outputFormat)) {
      setOutputFormat(first);
      setQuality(getDefaultQuality(first, preferences, "high"));
    }
  }, [mediaType]);

  useEffect(() => {
    const q = (quality as Record<string, unknown>)[outputFormat];
    if (q === undefined) {
      setQuality(getDefaultQuality(outputFormat, preferences, "high"));
    }
  }, [outputFormat]);

  const trimStartError = trimStart && parseTimeString(trimStart) === null ? "Invalid time format" : undefined;
  const trimEndError = trimEnd && parseTimeString(trimEnd) === null ? "Invalid time format" : undefined;

  const trimPreviewText = (() => {
    if (!supportsTrim) return undefined;
    const s = parseTimeString(trimStart);
    const e = parseTimeString(trimEnd);
    if (s === null && e === null) return undefined;
    if (s !== null && e !== null && e <= s) return "End must be after start";
    const startLabel = s !== null ? formatTimeString(s) : "start";
    const endLabel = e !== null ? formatTimeString(e) : "end";
    const duration = s !== null && e !== null ? ` · ${formatTimeString(e - s)} long` : "";
    return `Trim ${startLabel} → ${endLabel}${duration}`;
  })();

  const submit = async () => {
    if (!name.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Name required" });
      return;
    }
    if (trimStartError || trimEndError) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid trim time" });
      return;
    }
    try {
      await saveUserPreset({
        id: editing?.id,
        name: name.trim(),
        mediaType,
        outputFormat,
        quality,
        stripMetadata,
        trim: trimStart.trim() || trimEnd.trim() ? { start: trimStart.trim(), end: trimEnd.trim() } : undefined,
        outputDir: outputDir.trim() || undefined,
        description: description.trim() || undefined,
      });
      await onSaved();
      await showToast({
        style: Toast.Style.Success,
        title: editing ? "Preset updated" : "Preset saved",
      });
      pop();
    } catch (error) {
      showFailureToast(error, { title: "Failed to save preset" });
    }
  };

  return (
    <Form
      navigationTitle={editing ? `Edit ${editing.name}` : "New Preset"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={editing ? "Save Changes" : "Save Preset"} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="e.g. My Video Compression"
        value={name}
        onChange={setName}
        autoFocus={!editing}
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional notes"
        value={description}
        onChange={setDescription}
      />

      <Form.Separator />

      <Form.Dropdown
        id="mediaType"
        title="Media Type"
        value={mediaType}
        onChange={(v) => setMediaType(v as typeof mediaType)}
      >
        <Form.Dropdown.Item value="video" title="Video" />
        <Form.Dropdown.Item value="audio" title="Audio" />
        <Form.Dropdown.Item value="image" title="Image" />
        <Form.Dropdown.Item value="gif" title="GIF (from video)" />
      </Form.Dropdown>

      <Form.Dropdown
        id="outputFormat"
        title="Output Format"
        value={outputFormat}
        onChange={(v) => setOutputFormat(v as AllOutputExtension)}
      >
        {formats.map((f) => (
          <Form.Dropdown.Item key={f} value={f} title={f} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      {outputCategory === "gif" ? (
        <GifQualityControls
          settings={quality as { ".gif": { fps: GifFps; width: GifWidth; loop: boolean } }}
          onChange={setQuality}
        />
      ) : (
        <QualitySettingsComponent outputFormat={outputFormat} currentQuality={quality} onQualityChange={setQuality} />
      )}

      <Form.Separator />

      <Form.Checkbox
        id="stripMetadata"
        title="Privacy"
        label="Strip metadata (EXIF, GPS, tags)"
        value={stripMetadata}
        onChange={setStripMetadata}
      />

      {supportsTrim && (
        <>
          <Form.TextField
            id="trimStart"
            title="Trim Start"
            placeholder="0:30 or 30 or 00:00:30.000"
            value={trimStart}
            onChange={setTrimStart}
            error={trimStartError}
          />
          <Form.TextField
            id="trimEnd"
            title="Trim End"
            placeholder="1:30 or 90 or 00:01:30.000"
            value={trimEnd}
            onChange={setTrimEnd}
            error={trimEndError}
          />
          {trimPreviewText && <Form.Description text={trimPreviewText} />}
        </>
      )}

      <Form.TextField
        id="outputDir"
        title="Output Folder"
        placeholder="Leave blank to save alongside input"
        value={outputDir}
        onChange={setOutputDir}
        info="Absolute path. Applied when this preset is used."
      />
    </Form>
  );
}

function formatsForMediaType(m: MediaType | "gif"): AllOutputExtension[] {
  if (m === "image")
    return OUTPUT_IMAGE_EXTENSIONS.filter(
      (f) => process.platform === "darwin" || f !== ".heic",
    ) as AllOutputExtension[];
  if (m === "audio") return [...OUTPUT_AUDIO_EXTENSIONS];
  if (m === "gif") return [...OUTPUT_GIF_EXTENSIONS];
  return [...OUTPUT_VIDEO_EXTENSIONS];
}
