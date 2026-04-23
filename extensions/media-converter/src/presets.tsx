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
} from "./types/media";

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
            {!preset.builtIn && <RenamePresetAction preset={preset} onChange={onChange} />}
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
      onAction={() => push(<CreatePresetForm onSaved={onChange} />)}
    />
  );
}

function RenamePresetAction({ preset, onChange }: { preset: Preset; onChange: () => Promise<void> }) {
  const { push } = useNavigation();
  return (
    <Action
      title="Rename"
      icon={Icon.Pencil}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      onAction={() => push(<RenamePresetForm preset={preset} onSaved={onChange} />)}
    />
  );
}

function RenamePresetForm({ preset, onSaved }: { preset: Preset; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(preset.name);
  const [description, setDescription] = useState(preset.description ?? "");
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async () => {
              if (!name.trim()) {
                await showToast({ style: Toast.Style.Failure, title: "Name required" });
                return;
              }
              try {
                await saveUserPreset({
                  id: preset.id,
                  name: name.trim(),
                  mediaType: preset.mediaType,
                  outputFormat: preset.outputFormat,
                  quality: preset.quality,
                  trim: preset.trim,
                  stripMetadata: preset.stripMetadata,
                  outputDir: preset.outputDir,
                  description: description.trim() || undefined,
                });
                await onSaved();
                pop();
              } catch (error) {
                showFailureToast(error, { title: "Failed to save preset" });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" value={name} onChange={setName} />
      <Form.TextArea id="description" title="Description" value={description} onChange={setDescription} />
    </Form>
  );
}

function CreatePresetForm({ onSaved }: { onSaved: () => Promise<void> }) {
  const preferences = getPreferenceValues();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mediaType, setMediaType] = useState<MediaType | "gif">("video");
  const [outputFormat, setOutputFormat] = useState<AllOutputExtension>(".mp4");
  const [stripMetadata, setStripMetadata] = useState(false);
  const { pop } = useNavigation();

  const formats = formatsForMediaType(mediaType);

  useEffect(() => {
    // Reset output format to first valid one when media type changes
    const first = formats[0];
    if (first && !formats.includes(outputFormat)) {
      setOutputFormat(first);
    }
  }, [mediaType]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Preset"
            onSubmit={async () => {
              if (!name.trim()) {
                await showToast({ style: Toast.Style.Failure, title: "Name required" });
                return;
              }
              try {
                const quality: QualitySettings = getDefaultQuality(outputFormat, preferences, "high");
                await saveUserPreset({
                  name: name.trim(),
                  mediaType,
                  outputFormat,
                  quality,
                  stripMetadata,
                  description: description.trim() || undefined,
                });
                await onSaved();
                await showToast({ style: Toast.Style.Success, title: "Preset created" });
                pop();
              } catch (error) {
                showFailureToast(error, { title: "Failed to create preset" });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Presets store a default output format, quality and privacy option. To save more detailed settings (advanced quality controls, trim, custom output folder), use 'Save Settings as Preset…' from the Convert Media form." />
      <Form.TextField id="name" title="Name" value={name} onChange={setName} autoFocus={true} />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional notes"
        value={description}
        onChange={setDescription}
      />
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
      <Form.Checkbox
        id="stripMetadata"
        title="Privacy"
        label="Strip metadata (EXIF, GPS, tags)"
        value={stripMetadata}
        onChange={setStripMetadata}
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
