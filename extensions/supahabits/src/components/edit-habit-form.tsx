import { Action, ActionPanel, Form, getPreferenceValues, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import fetch from "node-fetch";

import { COLOR_OPTIONS } from "../utils/colors";
import { Habit } from "../models/habit";
import { showFailureToast } from "@raycast/utils";

interface EditHabitFormProps {
  habit: Habit;
  revalidate: () => void;
}

export default function EditHabitForm(props: EditHabitFormProps) {
  const { habit, revalidate } = props;
  const { secret } = getPreferenceValues<Preferences>();
  const { pop } = useNavigation();

  const updateHabit = async (values: {
    name: string;
    description: string;
    days: number;
    color: string;
    isRepeatable: boolean;
  }) => {
    const { name, description, days, color, isRepeatable } = values;

    if (!name || name === "") {
      showToast({ style: Toast.Style.Failure, title: "🚫 Habit name is required" });
      return;
    }

    try {
      await fetch(`https://www.supahabits.com/api/habits/${habit.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret,
          name,
          description,
          amount: days,
          repeatable: isRepeatable,
          color,
        }),
      });

      const habitType = isRepeatable ? "Repeatable habit" : "Habit";
      showToast({ style: Toast.Style.Success, title: `✅ ${habitType} updated successfully` });
      revalidate();
      pop();
    } catch (error) {
      showFailureToast("🚫 Failed to update habit");
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Habit" icon={Icon.ArrowClockwise} onSubmit={updateHabit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Habit Name" defaultValue={habit.name} />
      <Form.TextArea id="description" title="Description" defaultValue={habit.description} />
      <Form.Dropdown id="color" title="Habit Color" defaultValue={habit.color || "green"}>
        {Object.entries(COLOR_OPTIONS).map(([value, title]) => (
          <Form.Dropdown.Item key={value} value={value} title={title} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description
        title="Habit Type"
        text="Choose if this is a regular or repeatable habit. A repeatable habit can be submitted multiple times a day, it's great for habits like drinking water or reading a book."
      />
      <Form.Checkbox id="isRepeatable" label="Repeatable Habit" defaultValue={habit.repeatable} />

      <Form.Separator />

      <Form.Description
        title="Frequency"
        text="This is just for reference and analytics, you can submit it as many times as you want"
      />
      <Form.Dropdown
        id="days"
        title="How many days a week do you want to do this habit?"
        defaultValue={String(habit.amount)}
      >
        <Form.Dropdown.Item value="1" title="1 day" />
        <Form.Dropdown.Item value="2" title="2 days" />
        <Form.Dropdown.Item value="3" title="3 days" />
        <Form.Dropdown.Item value="4" title="4 days" />
        <Form.Dropdown.Item value="5" title="5 days" />
        <Form.Dropdown.Item value="6" title="6 days" />
        <Form.Dropdown.Item value="7" title="7 days" />
      </Form.Dropdown>
    </Form>
  );
}
