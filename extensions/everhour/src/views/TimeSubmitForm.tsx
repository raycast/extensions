import { Form, ActionPanel, SubmitFormAction, showToast, ToastStyle, useNavigation } from "@raycast/api";
import { submitTaskHours } from "../api";

export function TimeSubmitForm({ taskId, fetchTasks }: { taskId: string; fetchTasks: () => Promise<void> }) {
  const { pop } = useNavigation();

  const handleSubmit = async ({ hours }: { hours: string }) => {
    try {
      const { taskName } = await submitTaskHours(taskId, hours);

      if (taskName) {
        await fetchTasks();
        pop();
        await showToast(
          ToastStyle.Success,
          `Added ${hours} ${parseInt(hours) === 1 ? "hour" : "hours"} to ${taskName}`
        );
      } else {
        await showToast(ToastStyle.Failure, "Failed to add time");
      }
    } catch (error) {
      await showToast(ToastStyle.Failure, "Failed to add time");
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
      <Form.TextField id="hours" title="Hours" placeholder="0.25" />
    </Form>
  );
}
