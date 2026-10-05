import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { addStreak } from "./storage";
import { generateId, parseWholeNumber, Streak, todayDateString } from "./types";

interface FormValues {
  name: string;
  emoji: string;
  checkedEmoji: string;
  uncheckedEmoji: string;
  initialCount: string;
  showInMenuBar: boolean;
}

export default function CreateStreak() {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [countError, setCountError] = useState<string | undefined>();

  async function handleSubmit(values: FormValues) {
    const name = values.name?.trim();
    if (!name) {
      setNameError("Name is required");
      return;
    }

    const countRaw = values.initialCount?.trim() ?? "0";
    const count = parseWholeNumber(countRaw === "" ? "0" : countRaw);
    if (count === null) {
      setCountError("Must be a non-negative whole number");
      return;
    }

    const streak: Streak = {
      id: generateId(),
      name,
      emoji: values.emoji?.trim() || "🔥",
      checkedEmoji: values.checkedEmoji?.trim() || "✅",
      uncheckedEmoji: values.uncheckedEmoji?.trim() || "❌",
      count,
      lastCheckedDate: count > 0 ? todayDateString() : null,
      createdAt: new Date().toISOString(),
      frozen: false,
      showInMenuBar: values.showInMenuBar ?? true,
    };

    await addStreak(streak);

    await showToast({
      style: Toast.Style.Success,
      title: "Streak Created",
      message: `${streak.emoji} ${streak.name} — day ${streak.count}`,
    });

    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Streak" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="e.g. Gym, Reading, No Sugar"
        error={nameError}
        onChange={() => setNameError(undefined)}
        onBlur={(event) => {
          if (!event.target.value?.trim()) {
            setNameError("Name is required");
          }
        }}
      />
      <Form.TextField
        id="emoji"
        title="Streak Emoji"
        placeholder="🔥"
        defaultValue="🔥"
        info="Main emoji shown next to the streak name"
      />
      <Form.TextField
        id="checkedEmoji"
        title="Checked Today Emoji"
        placeholder="✅"
        defaultValue="✅"
        info="Shown when you have already checked in today"
      />
      <Form.TextField
        id="uncheckedEmoji"
        title="Not Checked Today Emoji"
        placeholder="❌"
        defaultValue="❌"
        info="Shown when you have not checked in today yet"
      />
      <Form.TextField
        id="initialCount"
        title="Starting Day"
        placeholder="0"
        defaultValue="0"
        error={countError}
        onChange={() => setCountError(undefined)}
        info="Set to transfer an existing streak (e.g. 17). Defaults to 0."
      />
      <Form.Checkbox
        id="showInMenuBar"
        label="Show in Menu Bar"
        defaultValue={true}
        title="Menu Bar"
        info="If enabled, this streak appears in the menu bar"
      />
    </Form>
  );
}
