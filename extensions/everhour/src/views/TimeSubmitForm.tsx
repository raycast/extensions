import { Form, ActionPanel, showToast, Action, Toast, Icon } from "@raycast/api";
import { submitTaskHours } from "../api";
import { createResolvedToast } from "../utils";

const timeOptions = [
  { title: "15 min", value: "0.25" },
  { title: "30 min", value: "0.5" },
  { title: "45 min", value: "0.75" },
  { title: "1 hour", value: "1" },
  { title: "1 hour 30 min", value: "1.5" },
  { title: "2 hour", value: "2" },
  { title: "2 hour 30 min", value: "2.5" },
  { title: "3 hour", value: "3" },
  { title: "3 hour 30 min", value: "3.5" },
  { title: "4 hour", value: "4" },
  { title: "4 hour 30 min", value: "4.5" },
  { title: "5 hour", value: "5" },
  { title: "5 hour 30 min", value: "5.5" },
  { title: "6 hour", value: "6" },
  { title: "6 hour 30 min", value: "6.5" },
  { title: "7 hour", value: "7" },
  { title: "7 hour 30 min", value: "7.5" },
];

export function TimeSubmitForm({ taskId, refreshRecords }: { taskId: string; refreshRecords: () => Promise<void> }) {
  const handleSubmit = async ({ hours }: { hours: string }) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding Time",
    });
    try {
      const { taskName } = await submitTaskHours(taskId, hours);

      if (taskName) {
        await refreshRecords();
        createResolvedToast(
          toast,
          `Added ${hours} ${parseInt(hours) === 1 ? "hour" : "hours"} to ${taskName}`,
        ).success();
      } else {
        createResolvedToast(toast, "Failed to Add Time").error();
      }
    } catch (error) {
      createResolvedToast(toast, "Failed to Add Time").error();
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Add Time" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Tasks / ${taskId} / Submit Custom Time`} />
      <Form.Dropdown id="hours" title="Time Spent" defaultValue="0.25">
        {timeOptions.map(({ value, title }) => (
          <Form.Dropdown.Item key={value} value={value} title={title} icon={Icon.Clock} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
