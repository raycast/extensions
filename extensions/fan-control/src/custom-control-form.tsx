import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  closeMainWindow,
  popToRoot,
  showToast,
  Keyboard,
} from "@raycast/api";
import { randomUUID } from "node:crypto";
import { useState } from "react";
import { setFanSpeed } from "./lib/smctl";
import type { CustomPreset } from "./types";

type FormValues = {
  name: string;
  rpm: string;
};

type Props = {
  preset?: CustomPreset;
  onSave: (preset: CustomPreset) => Promise<void>;
};

function parseRpm(value: string): number | undefined {
  const rpm = Number(value);
  return Number.isInteger(rpm) && rpm >= 1_000 && rpm <= 10_000
    ? rpm
    : undefined;
}

export function CustomControlForm({ preset, onSave }: Props) {
  const [rpmError, setRpmError] = useState<string>();
  const [nameError, setNameError] = useState<string>();

  function validateRpm(value: string): number | undefined {
    const rpm = parseRpm(value);
    setRpmError(rpm ? undefined : "Enter a whole number from 1,000 to 10,000");
    return rpm;
  }

  async function apply(values: FormValues) {
    const rpm = validateRpm(values.rpm);
    if (!rpm) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Setting fans to ${rpm.toLocaleString()} RPM`,
    });

    try {
      await setFanSpeed(rpm);
      toast.style = Toast.Style.Success;
      toast.title = "Custom fan speed applied";
      toast.message = `${rpm.toLocaleString()} RPM`;
      await closeMainWindow();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not set fan speed";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  async function save(values: FormValues) {
    const name = values.name.trim();
    const rpm = validateRpm(values.rpm);
    setNameError(name ? undefined : "Give this preset a name");
    if (!name || !rpm) return;

    await onSave({
      id: preset?.id ?? randomUUID(),
      name,
      rpm,
    });
    await showToast({
      style: Toast.Style.Success,
      title: preset ? "Preset updated" : "Preset saved",
      message: `${name} · ${rpm.toLocaleString()} RPM`,
    });
    await popToRoot();
  }

  return (
    <Form
      navigationTitle={preset ? `Edit ${preset.name}` : "Custom Fan Control"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Apply Speed Now"
            icon={Icon.Play}
            onSubmit={apply}
          />
          <Action.SubmitForm
            title={preset ? "Update Preset" : "Save as Preset"}
            icon={Icon.SaveDocument}
            shortcut={Keyboard.Shortcut.Common.Save}
            onSubmit={save}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="smctl clamps the target to your fan's hardware limits and keeps its thermal safety guard active." />
      <Form.TextField
        id="rpm"
        title="Fan Speed"
        placeholder="e.g. 3500"
        defaultValue={preset?.rpm.toString()}
        error={rpmError}
        onChange={() => rpmError && setRpmError(undefined)}
        info="A target between 1,000 and 10,000 RPM. Your Mac's hardware limits still apply."
      />
      <Form.Separator />
      <Form.TextField
        id="name"
        title="Preset Name"
        placeholder="e.g. Video Export"
        defaultValue={preset?.name}
        error={nameError}
        onChange={() => nameError && setNameError(undefined)}
        info="Only needed when saving this speed as a reusable preset."
      />
    </Form>
  );
}
