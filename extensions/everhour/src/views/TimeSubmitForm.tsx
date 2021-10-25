import { Form, ActionPanel, SubmitFormAction, showToast, ToastStyle, useNavigation } from "@raycast/api";
import { submitTaskHours } from "../api";
import { createResolvedToast } from "../utils";

const timeOptions = [
  "0.10",
  "0.15",
  "0.25",
  "0.5",
  "1",
  "1.5",
  "2",
  "2.5",
  "3",
  "3.5",
  "4",
  "4.5",
  "5",
  "5.5",
  "6",
  "6.5",
  "7",
  "7.5",
  "8",
];

export function TimeSubmitForm({ taskId, refreshRecords }: { taskId: string; refreshRecords: () => Promise<void> }) {
  const { pop } = useNavigation();

  const handleSubmit = async ({ hours }: { hours: string }) => {
    const toast = await showToast(ToastStyle.Animated, "Adding Time");
    try {
      const { taskName } = await submitTaskHours(taskId, hours);

      if (taskName) {
        await refreshRecords();
        pop();
        createResolvedToast(
          toast,
          `Added ${hours} ${parseInt(hours) === 1 ? "hour" : "hours"} to ${taskName}`
        ).success();
      } else {
        createResolvedToast(toast, "Failed to add time").error();
      }
    } catch (error) {
      createResolvedToast(toast, "Failed to add time").error();
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Add Hours" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="hours" title="Hours" defaultValue="0.25">
        {timeOptions.map((option) => (
          <Form.Dropdown.Item value={option} title={option} icon="⏱" />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
