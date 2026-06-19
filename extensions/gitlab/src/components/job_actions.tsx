import { Action, Color, Icon, showToast, Toast } from "@raycast/api";
import { gitlab } from "../common";
import { getErrorMessage, getIdFromGqlId, showErrorToast } from "../utils";
import { Job } from "./jobs";
import { JobLogView } from "./job_log";

const CANCELABLE_STATUSES = new Set(["pending", "running", "created", "scheduled", "preparing"]);

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

export function PlayJobAction(props: { job: Job; onAfter?: () => void }) {
  if (props.job.status?.toLowerCase() !== "manual") return null;
  async function handle() {
    try {
      const job = props.job;
      const jobId = getIdFromGqlId(job.id);
      await gitlab.playJob(job.projectId, jobId);
      showToast(Toast.Style.Success, "Job started");
      props.onAfter?.();
    } catch (error) {
      showErrorToast(getErrorMessage(error), "Failed to play job");
    }
  }
  return (
    <Action
      title="Play Job"
      icon={{ source: Icon.Play, tintColor: Color.Green }}
      shortcut={{ modifiers: ["cmd"], key: "p" }}
      onAction={handle}
    />
  );
}

export function CancelJobAction(props: { job: Job; onAfter?: () => void }) {
  if (!CANCELABLE_STATUSES.has(props.job.status?.toLowerCase() ?? "")) return null;
  async function handle() {
    try {
      const job = props.job;
      const jobId = getIdFromGqlId(job.id);
      await gitlab.cancelJob(job.projectId, jobId);
      showToast(Toast.Style.Success, "Job canceled");
      props.onAfter?.();
    } catch (error) {
      showErrorToast(getErrorMessage(error), "Failed to cancel job");
    }
  }
  return (
    <Action
      title="Cancel Job"
      icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={handle}
    />
  );
}

export function ShowJobLogAction(props: { job: Job; projectFullPath: string }) {
  return (
    <Action.Push
      title="Show Log"
      icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd"], key: "l" }}
      target={<JobLogView job={props.job} projectFullPath={props.projectFullPath} />}
    />
  );
}
