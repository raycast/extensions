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

export function EditHabitForm({
  habit,
  onRevalidate,
}: {
  habit: Habit;
  onRevalidate: () => void;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState(habit.name);

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
    await HabitService.updateHabitName(habit.id, name);

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
    </Form>
  );
}
