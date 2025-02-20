import { Action, ActionPanel, Form, getPreferenceValues, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import fetch from "node-fetch";

interface CreateHabitFormProps {
  revalidate: () => void;
}

export default function CreateRepeatableHabitForm(props: CreateHabitFormProps) {
  const { secret } = getPreferenceValues<Preferences>();
  const { revalidate } = props;
  const { pop } = useNavigation();

  const createHabit = async (values: { name: string; description: string }) => {
    const { name, description } = values;
    const DEFAULT_DAYS = 7;

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
        body: JSON.stringify({ secret, name, description, amount: DEFAULT_DAYS, repeatable: true }),
      });
      showToast({ style: Toast.Style.Success, title: "✅ Repeatable Habit created successfully" });
      revalidate();
      pop();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "🚫 Failed to create repeatable habit" });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Repeatable Habit" icon={Icon.Wand} onSubmit={createHabit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Info"
        text="This habit can be submitted multiple times a day, it's great for habits like drinking water or reading a book"
      />
      <Form.Separator />
      <Form.TextField id="name" title="Habit Name" placeholder="💧 Drink water" />
      <Form.TextArea id="description" title="Description" placeholder="Drink water" />
    </Form>
  );
}
