import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { newPresetId, Preset, PRESET_ICONS, setDefaultPreset, setPresetTaskName, upsertPreset } from "../lib/presets";

interface Props {
  /** Preset to edit; leave out to create a new one. */
  preset?: Preset;
  onSaved: () => void;
}

interface Values {
  name: string;
  taskName: string;
  icon: string;
  focusMinutes: string;
  shortBreakMinutes: string;
  longBreakMinutes: string;
  longBreakEvery: string;
  makeDefault: boolean;
}

const LIMITS = {
  focusMinutes: [1, 240],
  shortBreakMinutes: [1, 120],
  longBreakMinutes: [1, 180],
  longBreakEvery: [1, 12],
} as const;

function check(value: string, [min, max]: readonly [number, number]): string | undefined {
  const n = Number(value.trim());
  if (!value.trim() || !Number.isFinite(n)) return "Enter a number";
  if (n < min || n > max) return `Between ${min} and ${max}`;
  return undefined;
}

export function PresetForm({ preset, onSaved }: Props) {
  const { pop } = useNavigation();
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});

  const validate = (field: keyof typeof LIMITS, value?: string) =>
    setErrors((e) => ({ ...e, [field]: check(value ?? "", LIMITS[field]) }));

  async function submit(values: Values) {
    const next: Partial<Record<keyof Values, string>> = {
      name: values.name.trim() ? undefined : "Give it a name",
      focusMinutes: check(values.focusMinutes, LIMITS.focusMinutes),
      shortBreakMinutes: check(values.shortBreakMinutes, LIMITS.shortBreakMinutes),
      longBreakMinutes: check(values.longBreakMinutes, LIMITS.longBreakMinutes),
      longBreakEvery: check(values.longBreakEvery, LIMITS.longBreakEvery),
    };
    if (Object.values(next).some(Boolean)) {
      setErrors(next);
      return;
    }
    const saved: Preset = {
      id: preset?.id ?? newPresetId(values.name),
      name: values.name.trim(),
      taskName: values.taskName.trim() || undefined,
      icon: values.icon,
      focusMinutes: Number(values.focusMinutes),
      shortBreakMinutes: Number(values.shortBreakMinutes),
      longBreakMinutes: Number(values.longBreakMinutes),
      longBreakEvery: Math.round(Number(values.longBreakEvery)),
    };
    await upsertPreset(saved);
    if (values.makeDefault) await setDefaultPreset(saved.id);
    await showToast({ style: Toast.Style.Success, title: preset ? "Preset updated" : "Preset created" });
    onSaved();
    pop();
  }

  return (
    <Form
      navigationTitle={preset ? `Edit ${preset.name}` : "New Focus Preset"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={preset ? "Save Preset" : "Create Preset"} icon={Icon.Check} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="A preset sets how long you focus and rest, and optionally what you're working on. Pick one when starting, or make it your default for type-and-Enter." />
      <Form.TextField
        id="name"
        title="Name"
        placeholder="e.g. Study Session"
        defaultValue={preset?.name}
        error={errors.name}
        onChange={() => errors.name && setErrors((e) => ({ ...e, name: undefined }))}
      />
      <Form.TextField
        id="taskName"
        title="Task Name"
        placeholder="e.g. Thesis chapter 3 (optional)"
        info="Used when you start this preset without typing a task. Typing a task still overrides it."
        defaultValue={preset?.taskName}
      />
      <Form.Dropdown id="icon" title="Icon" defaultValue={preset?.icon ?? PRESET_ICONS[0]}>
        {PRESET_ICONS.map((icon) => (
          <Form.Dropdown.Item key={icon} value={icon} title={icon} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField
        id="focusMinutes"
        title="Focus (min)"
        defaultValue={String(preset?.focusMinutes ?? 25)}
        error={errors.focusMinutes}
        onBlur={(e) => validate("focusMinutes", e.target.value)}
      />
      <Form.TextField
        id="shortBreakMinutes"
        title="Short Break (min)"
        defaultValue={String(preset?.shortBreakMinutes ?? 5)}
        error={errors.shortBreakMinutes}
        onBlur={(e) => validate("shortBreakMinutes", e.target.value)}
      />
      <Form.TextField
        id="longBreakMinutes"
        title="Long Break (min)"
        defaultValue={String(preset?.longBreakMinutes ?? 15)}
        error={errors.longBreakMinutes}
        onBlur={(e) => validate("longBreakMinutes", e.target.value)}
      />
      <Form.TextField
        id="longBreakEvery"
        title="Long Break Every"
        info="Number of focus sessions before a long break"
        defaultValue={String(preset?.longBreakEvery ?? 4)}
        error={errors.longBreakEvery}
        onBlur={(e) => validate("longBreakEvery", e.target.value)}
      />
      <Form.Checkbox id="makeDefault" label="Use as default when I just type a task" defaultValue={false} />
    </Form>
  );
}

/** One-field form for naming what a preset is for. */
export function TaskNameForm({ preset, onSaved }: { preset: Preset; onSaved: () => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={`Task for ${preset.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Task Name"
            icon={Icon.Check}
            onSubmit={async (values: { taskName: string }) => {
              await setPresetTaskName(preset.id, values.taskName);
              await showToast({
                style: Toast.Style.Success,
                title: values.taskName.trim()
                  ? `${preset.icon} ${preset.name} → ${values.taskName.trim()}`
                  : "Task name cleared",
              });
              onSaved();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="taskName"
        title="Task Name"
        placeholder="e.g. Thesis chapter 3"
        info="Leave empty to clear it."
        defaultValue={preset.taskName}
        autoFocus
      />
    </Form>
  );
}
