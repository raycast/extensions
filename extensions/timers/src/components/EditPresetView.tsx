import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { showError } from "@chrismessina/raycast-kit";
import { useState } from "react";
import { CustomTimer } from "../backend/types";
import { updateCustomTimer } from "../backend/timerBackend";
import { soundData } from "../backend/soundData";

interface PresetValues {
  name: string;
  hours: string;
  minutes: string;
  seconds: string;
  selectedSound: string;
}

export default function EditPresetView({ id, preset }: { id: string; preset: CustomTimer }) {
  const { pop } = useNavigation();
  const [errors, setErrors] = useState<Partial<Record<keyof PresetValues, string>>>({});
  const validate = (field: keyof PresetValues, value: string) => {
    const error =
      field === "name"
        ? !value.trim()
          ? "Enter a preset name"
          : undefined
        : !Number.isFinite(Number(value)) || Number(value) < 0
          ? "Enter a non-negative number"
          : undefined;
    setErrors((current) => ({ ...current, [field]: error }));
    return error;
  };
  const submit = async (values: PresetValues) => {
    if ((["name", "hours", "minutes", "seconds"] as const).map((field) => validate(field, values[field])).some(Boolean))
      return;
    // Preserve the original number exactly for name/sound-only edits, including fine precision.
    const durationUnchanged = fields.every((field) => Number(values[field.id]) === field.value);
    const duration = durationUnchanged
      ? preset.timeInSeconds
      : Number(values.hours) * 3600 + Number(values.minutes) * 60 + Number(values.seconds);
    if (duration <= 0) {
      setErrors((current) => ({ ...current, seconds: "Enter a duration greater than zero" }));
      return;
    }
    try {
      updateCustomTimer(id, { name: values.name, timeInSeconds: duration, selectedSound: values.selectedSound });
      await showToast({ style: Toast.Style.Success, title: "Preset Updated" });
      pop();
    } catch (error) {
      await showError(error, { title: "Could Not Update Preset" });
    }
  };
  const fields = [
    { id: "hours" as const, title: "Hours", value: Math.floor(preset.timeInSeconds / 3600) },
    { id: "minutes" as const, title: "Minutes", value: Math.floor((preset.timeInSeconds % 3600) / 60) },
    { id: "seconds" as const, title: "Seconds", value: preset.timeInSeconds % 60 },
  ];
  return (
    <Form
      navigationTitle="Edit Preset"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Preset" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={preset.name}
        error={errors.name}
        onBlur={(event) => validate("name", event.target.value ?? "")}
        onChange={() => setErrors((current) => ({ ...current, name: undefined }))}
      />
      {fields.map((field) => (
        <Form.TextField
          key={field.id}
          id={field.id}
          title={field.title}
          defaultValue={String(field.value)}
          error={errors[field.id]}
          onBlur={(event) => validate(field.id, event.target.value ?? "")}
          onChange={() =>
            setErrors((current) => ({
              ...current,
              seconds: current.seconds === "Enter a duration greater than zero" ? undefined : current.seconds,
              [field.id]: undefined,
            }))
          }
        />
      ))}
      <Form.Dropdown id="selectedSound" title="Sound" defaultValue={preset.selectedSound}>
        <Form.Dropdown.Item value="default" title="Default" />
        {soundData.map((sound) => (
          <Form.Dropdown.Item key={sound.value} value={sound.value} title={sound.title} icon={sound.icon} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
