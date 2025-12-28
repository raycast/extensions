import {
  ActionPanel,
  Action,
  Form,
  useNavigation,
  showToast,
  Toast,
} from "@raycast/api";
import { HabitService } from "../api/habitService";
import { useState } from "react";
import { DAYS_OF_WEEK } from "../utils/frequency";
import { Frequency } from "../types/habit";

export function CreateHabitForm({
  onRevalidate,
}: {
  onRevalidate: () => void;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [frequencyType, setFrequencyType] = useState<"daily" | "custom">(
    "daily"
  );
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  async function handleSubmit() {
    if (!name.trim()) {
      showToast(Toast.Style.Failure, "Name is required");
      return;
    }

    let frequency: Frequency = "daily";
    if (frequencyType === "custom") {
      if (selectedDays.length === 0) {
        showToast(Toast.Style.Failure, "Select at least one day");
        return;
      }
      frequency = selectedDays.map((d) => parseInt(d));
    }

    await HabitService.createHabit(name, frequency);
    showToast(Toast.Style.Success, "Habit created");
    onRevalidate();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Habit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Read 10 pages"
        value={name}
        onChange={setName}
      />
      <Form.Dropdown
        id="frequency"
        title="Frequency"
        value={frequencyType}
        onChange={(v) => setFrequencyType(v as "daily" | "custom")}
      >
        <Form.Dropdown.Item value="daily" title="Daily" />
        <Form.Dropdown.Item value="custom" title="Specific Days" />
      </Form.Dropdown>

      {frequencyType === "custom" && (
        <Form.TagPicker
          id="days"
          title="Days"
          value={selectedDays}
          onChange={setSelectedDays}
        >
          {DAYS_OF_WEEK.map((day) => (
            <Form.TagPicker.Item
              key={day.value}
              value={day.value.toString()}
              title={day.label}
            />
          ))}
        </Form.TagPicker>
      )}
    </Form>
  );
}
