import { Action, ActionPanel, Form, LocalStorage, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";

export interface WaterTrackingFormValues {
  goal: string;
  reminder: string;
  quantity: string;
}

export default function Command() {
  const { handleSubmit, itemProps } = useForm<WaterTrackingFormValues>({
    onSubmit: async (values) => {
      showToast({
        style: Toast.Style.Success,
        title: "Reminder Created",
        message: `You will receive a reminder every ${values.reminder} to drink water.`,
      });
      await LocalStorage.setItem("waterGoal", values.goal);
      await LocalStorage.setItem("waterReminder", values.reminder);
      await LocalStorage.setItem("waterQuantity", values.quantity);
      await LocalStorage.setItem("lastReminderTime", Date.now().toString());
    },
    validation: {
      goal: FormValidation.Required,
      reminder: FormValidation.Required,
      quantity: FormValidation.Required,
    },
  });

  // Generate goal options (50ml increments from 250 to 3000)
  const goalOptions = Array.from({ length: 76 }, (_, i) => ({
    value: (250 + i * 50).toString(),
    title: `${250 + i * 50} ml`,
  }));

  // Generate quantity options (5ml increments from 5 to 250)
  const quantityOptions = Array.from({ length: 100 }, (_, i) => ({
    value: ((i + 1) * 5).toString(),
    title: `${(i + 1) * 5} ml`,
  }));

  const timeOptions = Array.from({ length: 60 }, (_, i) => ({
    value: (i + 1).toString(),
    title: `${i + 1} min`,
  }));

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Daily Water Goal" {...itemProps.goal}>
        {goalOptions.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown title="Sip Quantity" {...itemProps.quantity}>
        {quantityOptions.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown title="Reminder" {...itemProps.reminder}>
        {timeOptions.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
