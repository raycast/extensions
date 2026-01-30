import { Action, ActionPanel, Form, Icon, LocalStorage, popToRoot, showToast, Toast } from "@raycast/api";
import { useState } from "react";

const PRESETS = [
  { value: "custom", title: "Custom" },
  { value: "0:5:0", title: "5 min" },
  { value: "0:10:0", title: "10 min" },
  { value: "0:15:0", title: "15 min" },
  { value: "0:25:0", title: "25 min" },
  { value: "0:30:0", title: "30 min" },
  { value: "0:45:0", title: "45 min" },
  { value: "1:0:0", title: "1 hour" },
];

export interface QuickTimerEntry {
  label: string;
  expiresAt: number; // Unix ms
  notified: boolean;
}

const TIMER_KEY = "quick-timers";

export async function loadTimers(): Promise<QuickTimerEntry[]> {
  const raw = await LocalStorage.getItem<string>(TIMER_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as QuickTimerEntry[];
}

export async function saveTimers(timers: QuickTimerEntry[]): Promise<void> {
  await LocalStorage.setItem(TIMER_KEY, JSON.stringify(timers));
}

interface FormValues {
  preset: string;
  hours: string;
  minutes: string;
  seconds: string;
  title: string;
}

export default function QuickTimer() {
  const [preset, setPreset] = useState("custom");

  async function onSubmit(values: FormValues) {
    let hours: number, minutes: number, seconds: number;

    if (values.preset === "custom") {
      hours = parseInt(values.hours, 10) || 0;
      minutes = parseInt(values.minutes, 10) || 0;
      seconds = parseInt(values.seconds, 10) || 0;
    } else {
      const parts = values.preset.split(":");
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10);
      seconds = parseInt(parts[2], 10);
    }

    if (hours <= 0 && minutes <= 0 && seconds <= 0) {
      showToast({ style: Toast.Style.Failure, title: "Enter a duration greater than zero" });
      return;
    }

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    const label = values.title || "Timer";

    const timers = await loadTimers();
    timers.push({ label, expiresAt: Date.now() + totalSeconds * 1000, notified: false });
    await saveTimers(timers);

    const display = [hours > 0 && `${hours}h`, minutes > 0 && `${minutes}m`, seconds > 0 && `${seconds}s`]
      .filter(Boolean)
      .join(" ");
    showToast({ style: Toast.Style.Success, title: `Timer set for ${display}` });
    popToRoot();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Timer" icon={Icon.Clock} onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Timer"
        text="Set a background timer. You'll get a notification and sound when it's done."
      />

      <Form.Separator />

      <Form.Dropdown id="preset" title="Duration" value={preset} onChange={setPreset}>
        {PRESETS.map((p) => (
          <Form.Dropdown.Item
            key={p.value}
            value={p.value}
            title={p.title}
            icon={p.value === "custom" ? Icon.Pencil : Icon.Clock}
          />
        ))}
      </Form.Dropdown>

      {preset === "custom" && (
        <>
          <Form.TextField id="hours" title="Hours" placeholder="0" defaultValue="0" />
          <Form.TextField id="minutes" title="Minutes" placeholder="0" defaultValue="0" />
          <Form.TextField id="seconds" title="Seconds" placeholder="0" defaultValue="0" />
        </>
      )}

      <Form.Separator />

      <Form.TextField id="title" title="Label" placeholder="e.g. Coffee break" defaultValue="Timer" />
    </Form>
  );
}
