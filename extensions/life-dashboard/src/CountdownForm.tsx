import { Action, ActionPanel, Form, launchCommand, LaunchType, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { Countdown, saveCountdown } from "./countdowns";

export default function CountdownForm({ countdown, onDone }: { countdown?: Countdown; onDone?: () => void }) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();

  async function submit(values: { name: string; emoji: string; date: Date | null }) {
    if (!values.name.trim()) {
      setNameError("Give it a name");
      return;
    }
    if (!values.date) {
      await showToast({ style: Toast.Style.Failure, title: "Pick a date" });
      return;
    }
    const iso = `${values.date.getFullYear()}-${String(values.date.getMonth() + 1).padStart(2, "0")}-${String(
      values.date.getDate(),
    ).padStart(2, "0")}`;
    await saveCountdown({
      id: countdown?.id,
      name: values.name.trim(),
      emoji: values.emoji.trim() || "🎯",
      date: iso,
    });
    try {
      await launchCommand({ name: "life-menubar", type: LaunchType.Background });
    } catch {
      // menu bar refreshes on its own interval
    }
    await showToast({
      style: Toast.Style.Success,
      title: countdown ? "Countdown updated" : "Countdown created",
      message: values.name.trim(),
    });
    onDone?.();
    pop();
  }

  return (
    <Form
      navigationTitle={countdown ? "Edit Countdown" : "Create Countdown"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={countdown ? "Save Countdown" : "Create Countdown"} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Trip to Japan"
        defaultValue={countdown?.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextField id="emoji" title="Emoji" placeholder="🎯" defaultValue={countdown?.emoji} />
      <Form.DatePicker
        id="date"
        title="Date"
        type={Form.DatePicker.Type.Date}
        defaultValue={countdown ? new Date(`${countdown.date}T00:00:00`) : undefined}
      />
      <Form.Description text="Shows in Life Progress and in the menu bar dropdown with days, weeks, months, and years remaining." />
    </Form>
  );
}
