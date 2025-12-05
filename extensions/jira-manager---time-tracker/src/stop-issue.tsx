import { Action, ActionPanel, Form, showToast, Toast, useNavigation, Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getActiveIssue, stopIssue } from "./utils/storage";
import { addWorklog } from "./utils/jira";

export default function Command() {
  const { pop } = useNavigation();
  const { data: activeIssue, isLoading } = usePromise(getActiveIssue);

  async function handleSubmit(values: { comment: string }) {
    if (!activeIssue) return;

    try {
      showToast({ style: Toast.Style.Animated, title: "Stopping and logging work..." });

      const stopped = await stopIssue();
      if (stopped) {
        await addWorklog(stopped.issueKey, stopped.timeSpentSeconds, values.comment, stopped.started);
        showToast({ style: Toast.Style.Success, title: "Work logged", message: `${stopped.timeSpentSeconds}s logged` });
        pop();
      } else {
        showToast({ style: Toast.Style.Failure, title: "No active issue to stop" });
      }
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to log work", message: String(error) });
    }
  }

  if (isLoading) return <Detail isLoading />;

  if (!activeIssue) {
    return <Detail markdown="No issue is currently running." />;
  }

  // Calculate elapsed time for display only (live update not strictly real-time in this view but good enough)
  const currentElapsed = Math.floor((Date.now() - activeIssue.startTime) / 1000);
  const hours = Math.floor(currentElapsed / 3600);
  const minutes = Math.floor((currentElapsed % 3600) / 60);
  const seconds = currentElapsed % 60;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Stop & Log Work" />
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
