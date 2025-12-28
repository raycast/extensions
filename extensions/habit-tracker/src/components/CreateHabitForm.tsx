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

export function CreateHabitForm({
  onRevalidate,
}: {
  onRevalidate: () => void;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");

  async function handleSubmit() {
    if (!name.trim()) {
      showToast(Toast.Style.Failure, "Name is required");
      return;
    }

    await HabitService.createHabit(name);
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
    </Form>
  );
}
