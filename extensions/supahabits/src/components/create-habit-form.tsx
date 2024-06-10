import { Action, ActionPanel, Form, getPreferenceValues, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import fetch from "node-fetch";

interface CreateHabitFormProps {
  revalidate: () => void;
}

export default function CreateHabitForm(props: CreateHabitFormProps) {
  const { secret } = getPreferenceValues<Preferences>();
  const { revalidate } = props;
  const { pop } = useNavigation();

  const createHabit = async (values: { name: string; description: string; days: number }) => {
    const { name, description, days } = values;

    if (!name || name === "") {
      showToast({ style: Toast.Style.Failure, title: "🚫 Habit name is required" });
      return;
    }

    try {
      await fetch(`https://www.supahabits.com/api/habits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ secret, name, description, amount: days }),
      });
      showToast({ style: Toast.Style.Success, title: "✅ Habit created successfully" });
      revalidate();
      pop();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "🚫 Failed to create habit" });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Habit" icon={Icon.Wand} onSubmit={createHabit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Habit Name" placeholder="💪🏼 Workout" />
      <Form.TextArea id="description" title="Description" placeholder="Do 10 pushups and 10 squats" />
      <Form.Separator />
      <Form.Description
        title="Note"
        text="This is just for reference and analytics, you can submit it as many times as you want"
      />
      <Form.Dropdown id="days" title="How many days a week do you want to do this habit?" defaultValue="7">
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
