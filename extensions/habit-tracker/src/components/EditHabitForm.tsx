import {
  ActionPanel,
  Action,
  Form,
  useNavigation,
  showToast,
  Toast,
} from "@raycast/api";
import { HabitService } from "../api/habitService";
import { Habit } from "../types/habit";
import { useState } from "react";
import { Frequency } from "../types/habit";
import { DAYS_OF_WEEK } from "../utils/frequency";

export function EditHabitForm({
  habit,
  onRevalidate,
}: {
  habit: Habit;
  onRevalidate: () => void;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState(habit.name);
  const [frequencyType, setFrequencyType] = useState<"daily" | "custom">(() =>
    Array.isArray(habit.frequency) ? "custom" : "daily"
  );
  const [selectedDays, setSelectedDays] = useState<string[]>(() =>
    Array.isArray(habit.frequency) ? habit.frequency.map(String) : []
  );

  async function handleSubmit() {
    if (!name.trim()) {
      showToast(Toast.Style.Failure, "Name is required");
      return;
    }

    // Update habit logic
    // We need a HabitService.updateHabit method
    // Assuming it exists or I add it. I added `updateHabit` to StorageService but not exposed in HabitService?
    // Checking `api / habitService.ts`: `togglePause` uses `updateHabit`.

    // Use HabitService.
    let frequency: Frequency = "daily";
    if (frequencyType === "custom") {
      if (selectedDays.length === 0) {
        showToast(Toast.Style.Failure, "Select at least one day");
        return;
      }
      frequency = selectedDays.map((d) => parseInt(d));
    }

    await HabitService.updateHabit(habit.id, { name, frequency });

    showToast(Toast.Style.Success, "Habit updated");
    onRevalidate();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" value={name} onChange={setName} />
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
