import { Action, ActionPanel, Form, showToast, Toast, useNavigation, Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getActiveIssue, pauseIssue } from "./utils/storage";
import { addWorklog } from "./utils/jira";

export default function Command() {
  const { pop } = useNavigation();
  const { data: activeIssue, isLoading } = usePromise(getActiveIssue);

  async function handleSubmit(values: { comment: string }) {
    if (!activeIssue) return;

    try {
      showToast({ style: Toast.Style.Animated, title: "Pausing and logging work..." });

      const paused = await pauseIssue();
      if (paused) {
        await addWorklog(paused.issueKey, paused.timeSpentSeconds, values.comment, paused.started);
        showToast({
          style: Toast.Style.Success,
          title: "Work logged & Paused",
          message: `${paused.timeSpentSeconds}s logged`,
        });
        pop();
      } else {
        showToast({ style: Toast.Style.Failure, title: "No active issue to pause" });
      }
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to log work", message: String(error) });
    }
  }

  if (isLoading) return <Detail isLoading />;

  if (!activeIssue || !activeIssue.isRunning) {
    return <Detail markdown="No issue is currently running." />;
  }

  const currentElapsed = Math.floor((Date.now() - activeIssue.startTime) / 1000);
  const hours = Math.floor(currentElapsed / 3600);
  const minutes = Math.floor((currentElapsed % 3600) / 60);
  const seconds = currentElapsed % 60;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Pause & Log Work" />
        </ActionPanel>
      }
    >
      <Form.Description title="Issue" text={`${activeIssue.issueKey} - ${activeIssue.summary || ""}`} />
      <Form.Description title="Started At" text={new Date(activeIssue.startTime).toLocaleString()} />
      <Form.Description title="Time Spent (Approx)" text={`${hours}h ${minutes}m ${seconds}s`} />
      <Form.TextArea id="comment" title="Worklog Comment" placeholder="What did you work on?" />
    </Form>
  );
}
