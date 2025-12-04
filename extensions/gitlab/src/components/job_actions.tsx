import { Action, Color, Icon, showToast, Toast } from "@raycast/api";
import { gitlab } from "../common";
import { getErrorMessage, getIdFromGqlId, showErrorToast } from "../utils";
import { Job } from "./jobs";

export function RefreshJobsAction(props: { onRefreshJobs?: () => void }) {
  const handle = () => {
    if (props.onRefreshJobs) {
      props.onRefreshJobs();
    }
  };
  return (
    <Action
      title="Refresh"
      icon={{ source: Icon.ArrowClockwise, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={handle}
    />
  );
}

export function RetryJobAction(props: { job: Job }) {
  async function handle() {
    try {
      console.log("job_actions:25");
      console.log(props);
      const job = props.job;
      const jobId = getIdFromGqlId(job.id);
      await gitlab.post(`projects/${job.projectId}/jobs/${jobId}/retry`);
      showToast(Toast.Style.Success, "Restarted job");
    } catch (error) {
      showErrorToast(getErrorMessage(error), "Failed to restart job");
    }
  }
  return <Action title="Retry" icon={{ source: Icon.Repeat, tintColor: Color.PrimaryText }} onAction={handle} />;
}
