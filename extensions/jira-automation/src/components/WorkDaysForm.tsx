import { Form, ActionPanel, Action, LocalStorage, showToast, Toast, useNavigation } from "@raycast/api";

interface Props {
  onDone: () => void;
  initialDays: string[];
}

export default function WorkDaysForm({ onDone, initialDays }: Props) {
  const { pop } = useNavigation();

  const handleSubmit = async (values: Record<string, boolean>) => {
    try {
      // Map checkbox values to day strings
      const selectedDays = Object.entries(values)
        .filter(([, checked]) => checked)
        .map(([dayId]) => dayId.replace("day", ""));

      await LocalStorage.setItem("workDays", JSON.stringify(selectedDays));
      await showToast({
        style: Toast.Style.Success,
        title: "Work days updated",
      });
      onDone();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save work days",
        message: String(error),
      });
    }
  };

  const days = [
    { id: "day0", label: "Sunday" },
    { id: "day1", label: "Monday" },
    { id: "day2", label: "Tuesday" },
    { id: "day3", label: "Wednesday" },
    { id: "day4", label: "Thursday" },
    { id: "day5", label: "Friday" },
    { id: "day6", label: "Saturday" },
  ];

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Work Days" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Select the days you work to highlight them in the calendar." />
      {days.map((day) => (
        <Form.Checkbox
          key={day.id}
          id={day.id}
          label={day.label}
          defaultValue={initialDays.includes(day.id.replace("day", ""))}
        />
      ))}
    </Form>
  );
}
