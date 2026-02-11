import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { syncReminders } from "../utils/reminders";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ConfigureReminderForm({ onDone }: { onDone?: () => void }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [initialValues, setInitialValues] = useState<{
    time: string;
    days: string[];
  }>({
    time: "17:00",
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  });

  useEffect(() => {
    async function load() {
      const storedTime = await LocalStorage.getItem<string>("reminderTime");
      const storedDays = await LocalStorage.getItem<string>("reminderDays");

      setInitialValues({
        time: storedTime || "17:00",
        days: storedDays ? JSON.parse(storedDays) : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      });
      setIsLoading(false);
    }
    load();
  }, []);

  const handleSubmit = async (values: { time: string; days: string[] }) => {
    if (!values.time || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(values.time)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid time format",
        message: "Please use HH:mm (e.g., 09:30)",
      });
      return;
    }
    if (values.days.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No days selected",
        message: "Please select at least one day",
      });
      return;
    }

    await LocalStorage.setItem("reminderTime", values.time);
    await LocalStorage.setItem("reminderDays", JSON.stringify(values.days));
    await LocalStorage.setItem("reminderEnabled", "true");

    await syncReminders(values.time, values.days, true);

    await showToast({
      style: Toast.Style.Success,
      title: "Reminder configured",
      message: "Synced with macOS Reminders",
    });
    if (onDone) onDone();
    pop();
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Configuration" icon={Icon.Checkmark} onSubmit={handleSubmit} />
          <Action
            title="Disable Reminder"
            icon={Icon.XMarkCircle}
            onAction={async () => {
              await LocalStorage.setItem("reminderEnabled", "false");
              await syncReminders("", [], false);
              await showToast({
                title: "Reminder disabled",
                message: "Removed from macOS Reminders",
              });
              if (onDone) onDone();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      {!isLoading && (
        <>
          <Form.Description text="Configure when you want to be reminded to log your work in Jira." />
          <Form.TextField
            id="time"
            title="Reminder Time (HH:mm)"
            placeholder="e.g., 17:00"
            defaultValue={initialValues.time}
          />
          <Form.TagPicker id="days" title="Repeat on Days" defaultValue={initialValues.days}>
            {DAYS.map((day) => (
              <Form.TagPicker.Item key={day} value={day} title={day} />
            ))}
          </Form.TagPicker>
        </>
      )}
    </Form>
  );
}
