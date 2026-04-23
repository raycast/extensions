import { useEffect, useState } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  useNavigation,
  Form,
  getPreferenceValues,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getAllPresets, deleteUserPreset, duplicatePreset, saveUserPreset } from "./utils/presets";
import {
  Preset,
  AllOutputExtension,
  QualitySettings,
  MediaType,
  OUTPUT_IMAGE_EXTENSIONS,
  OUTPUT_AUDIO_EXTENSIONS,
  OUTPUT_VIDEO_EXTENSIONS,
  OUTPUT_GIF_EXTENSIONS,
  getDefaultQuality,
  getOutputCategory,
  GifFps,
  GifWidth,
} from "./types/media";
import { parseTimeString, formatTimeString } from "./utils/time";
import { GifQualityControls, QualitySettingsComponent } from "./components/ConverterForm";

export default function Command() {
  const [presets, setPresets] = useState<Preset[] | null>(null);

  const reload = async () => {
    try {
      const all = await getAllPresets();
      setPresets(all);
    } catch (error) {
      showFailureToast(error, { title: "Failed to load presets" });
      setPresets([]);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  if (presets === null) return <List isLoading={true} />;

  const builtIns = presets.filter((p) => p.builtIn);
  const userPresets = presets.filter((p) => !p.builtIn);

  return (
    <List
      searchBarPlaceholder="Search presets"
      actions={
        <ActionPanel>
          <CreatePresetAction onChange={reload} />
        </ActionPanel>
      }
    >
      {builtIns.length > 0 && (
        <List.Section title="Built-in">
          {builtIns.map((p) => (
            <PresetItem key={p.id} preset={p} onChange={reload} />
          ))}
        </List.Section>
      )}
      <List.Section title="My Presets">
        {userPresets.length === 0 ? (
          <List.Item
            title="No user presets yet"
            subtitle="Save current form settings via 'Save Settings as Preset…' in the Convert Media form, or use the action below."
            icon={Icon.Stars}
            actions={
              <ActionPanel>
                <CreatePresetAction onChange={reload} />
              </ActionPanel>
            }
          />
        ) : (
          userPresets.map((p) => <PresetItem key={p.id} preset={p} onChange={reload} />)
        )}
      </List.Section>
    </List>
  );
}

function PresetItem({ preset, onChange }: { preset: Preset; onChange: () => Promise<void> }) {
  const subtitle = preset.description ?? describePreset(preset);
  const accessories: List.Item.Accessory[] = [
    { tag: { value: preset.outputFormat, color: Color.Blue } },
    { text: preset.mediaType },
  ];
  if (preset.stripMetadata) accessories.push({ icon: Icon.EyeDisabled, tooltip: "Strips metadata" });
  if (preset.trim) accessories.push({ icon: Icon.FilmStrip, tooltip: "Includes trim settings" });

  return (
    <List.Item
      title={preset.name}
      subtitle={subtitle}
      icon={preset.builtIn ? Icon.Star : Icon.StarCircle}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Duplicate to My Presets"
              icon={Icon.Duplicate}
              onAction={async () => {
                try {
                  await duplicatePreset(preset.id);
                  await onChange();
                  await showToast({ style: Toast.Style.Success, title: "Preset duplicated" });
                } catch (error) {
                  showFailureToast(error, { title: "Failed to duplicate preset" });
                }
              }}
            />
            {!preset.builtIn && <EditPresetAction preset={preset} onChange={onChange} />}
          </ActionPanel.Section>
          {!preset.builtIn && (
            <ActionPanel.Section>
              <Action
                title="Delete Preset"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={async () => {
                  if (
                    await confirmAlert({
                      title: `Delete "${preset.name}"?`,
                      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                    })
                  ) {
                    await deleteUserPreset(preset.id);
                    await onChange();
                  }
                }}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            <CreatePresetAction onChange={onChange} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function CreatePresetAction({ onChange }: { onChange: () => Promise<void> }) {
  const { push } = useNavigation();
  return (
    <Action
      title="Create New Preset…"
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      onAction={() => push(<PresetEditorForm mode="create" onSaved={onChange} />)}
    />
  );
}

function EditPresetAction({ preset, onChange }: { preset: Preset; onChange: () => Promise<void> }) {
  const { push } = useNavigation();
  return (
    <Action
      title="Edit Preset…"
      icon={Icon.Pencil}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      onAction={() => push(<PresetEditorForm mode="edit" preset={preset} onSaved={onChange} />)}
    />
  );
}

type EditorMode = { mode: "create" } | { mode: "edit"; preset: Preset };

function PresetEditorForm({ onSaved, ...rest }: { onSaved: () => Promise<void> } & EditorMode) {
  const preferences = getPreferenceValues();
  const { pop } = useNavigation();
  const editing = rest.mode === "edit" ? rest.preset : null;

  const [name, setName] = useState(editing?.name ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [mediaType, setMediaType] = useState<MediaType | "gif">(editing?.mediaType ?? "video");
  const [outputFormat, setOutputFormat] = useState<AllOutputExtension>(editing?.outputFormat ?? ".mp4");
  const [quality, setQuality] = useState<QualitySettings>(
    editing?.quality ?? getDefaultQuality(editing?.outputFormat ?? ".mp4", preferences, "high"),
  );
  const [stripMetadata, setStripMetadata] = useState<boolean>(editing?.stripMetadata ?? false);
  const [trimStart, setTrimStart] = useState(editing?.trim?.start ?? "");
  const [trimEnd, setTrimEnd] = useState(editing?.trim?.end ?? "");
  const [outputDir, setOutputDir] = useState(editing?.outputDir ?? "");

  const formats = formatsForMediaType(mediaType);
  const outputCategory = getOutputCategory(outputFormat);
  const supportsTrim = outputCategory === "video" || outputCategory === "audio" || outputCategory === "gif";

  // When media type changes, reset the output format + quality so they stay consistent.
  useEffect(() => {
    const first = formats[0];
    if (first && !formats.includes(outputFormat)) {
      setOutputFormat(first);
      setQuality(getDefaultQuality(first, preferences, "high"));
    }
  }, [mediaType]);

  // When output format changes within the same media type, reset quality to sensible defaults.
  useEffect(() => {
    // Only reset if the current quality doesn't have an entry for the new format.
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
        title: editing ? "Preset updated" : "Preset created",
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
          <Action.SubmitForm title={editing ? "Save Changes" : "Create Preset"} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" value={name} onChange={setName} autoFocus={!editing} />
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

function describePreset(p: Preset): string {
  const parts: string[] = [p.outputFormat];
  const q = (p.quality as Record<string, unknown>)[p.outputFormat];
  if (typeof q === "number") parts.push(`quality ${q}`);
  else if (typeof q === "string") parts.push(q);
  else if (q && typeof q === "object") {
    const obj = q as Record<string, unknown>;
    if (obj.bitrate) parts.push(`${obj.bitrate}kbps`);
    if (obj.crf !== undefined) parts.push(`CRF ${obj.crf}`);
    if (obj.variant) parts.push(`ProRes ${obj.variant}`);
    if (obj.fps) parts.push(`${obj.fps}fps`);
  }
  if (p.stripMetadata) parts.push("strip metadata");
  return parts.join(" · ");
}
