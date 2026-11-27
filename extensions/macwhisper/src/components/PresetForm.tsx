import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { EXPORT_STYLES, ExportStyle, GROUPINGS, Grouping, OutputFormat } from "../lib/mw";
import { fromTriState, parsePositiveNumber, toTriState } from "../lib/options";
import { newPresetId, Preset } from "../lib/presets";
import { FormatDropdown, TriStateDropdown } from "./TranscriptionOptionFields";

type FormValues = {
  name: string;
  format: OutputFormat;
  style: string;
  group: string;
  speakers: string;
  speakerNames: string;
  timestamps: string;
  endTimestamps: boolean;
  milliseconds: boolean;
  maxCharsPerLine: string;
  fps: string;
};

type Props = {
  preset?: Preset;
  /** Resolves to true once the preset is saved; the form stays open otherwise so no input is lost. */
  onSave: (preset: Preset) => Promise<boolean>;
};

export function PresetForm({ preset, onSave }: Props) {
  const { pop } = useNavigation();

  async function handleSubmit(values: FormValues) {
    const style = values.style ? (values.style as ExportStyle) : undefined;
    const saved = await onSave({
      id: preset?.id ?? newPresetId(),
      name: values.name.trim() || "Untitled Preset",
      format: values.format,
      style,
      group: style === "transcript" && values.group ? (values.group as Grouping) : undefined,
      speakers: fromTriState(values.speakers),
      speakerNames: fromTriState(values.speakerNames),
      timestamps: fromTriState(values.timestamps),
      endTimestamps: values.endTimestamps || undefined,
      milliseconds: values.milliseconds || undefined,
      maxCharsPerLine: parsePositiveNumber(values.maxCharsPerLine),
      fps: parsePositiveNumber(values.fps),
    });
    if (saved) pop();
  }

  return (
    <Form
      navigationTitle={preset ? `Edit ${preset.name}` : "New Export Preset"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Preset" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Podcast show notes" defaultValue={preset?.name} />
      <FormatDropdown defaultValue={preset?.format ?? "txt"} storeValue={false} />
      <Form.Dropdown id="style" title="Style" defaultValue={preset?.style ?? ""}>
        <Form.Dropdown.Item value="" title="Format Default" />
        {EXPORT_STYLES.map((style) => (
          <Form.Dropdown.Item key={style} value={style} title={style[0].toUpperCase() + style.slice(1)} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="group"
        title="Grouping"
        info="Only used with the Transcript style"
        defaultValue={preset?.group ?? ""}
      >
        <Form.Dropdown.Item value="" title="Style Default" />
        {GROUPINGS.map((group) => (
          <Form.Dropdown.Item key={group} value={group} title={group[0].toUpperCase() + group.slice(1)} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <TriStateDropdown
        id="speakers"
        title="Speaker Detection"
        defaultValue={toTriState(preset?.speakers)}
        storeValue={false}
      />
      <TriStateDropdown
        id="speakerNames"
        title="Speaker Names"
        defaultValue={toTriState(preset?.speakerNames)}
        storeValue={false}
      />
      <TriStateDropdown
        id="timestamps"
        title="Timestamps"
        defaultValue={toTriState(preset?.timestamps)}
        storeValue={false}
      />
      <Form.Checkbox id="endTimestamps" label="Show end timestamps" defaultValue={preset?.endTimestamps ?? false} />
      <Form.Checkbox id="milliseconds" label="Include milliseconds" defaultValue={preset?.milliseconds ?? false} />
      <Form.Separator />
      <Form.TextField
        id="maxCharsPerLine"
        title="Max Characters per Line"
        placeholder="42"
        defaultValue={preset?.maxCharsPerLine ? String(preset.maxCharsPerLine) : ""}
      />
      <Form.TextField
        id="fps"
        title="Frames per Second"
        info="Only used by the Avid format"
        placeholder="25"
        defaultValue={preset?.fps ? String(preset.fps) : ""}
      />
    </Form>
  );
}
