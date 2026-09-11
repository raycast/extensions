import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { jobDuration, jobLocation, jobStatus, WorkflowJob, WorkflowRun, workflowRunJobs } from "./lib/github";
import { errorMessage, Pool } from "./lib/runpool";

function statusColor(job: WorkflowJob): Color {
  switch (jobStatus(job)) {
    case "success":
      return Color.Green;
    case "failure":
    case "timed out":
    case "startup failure":
      return Color.Red;
    case "cancelled":
    case "skipped":
      return Color.SecondaryText;
    default:
      return Color.Orange;
  }
}

/** The parent list stays compact; this view is the workflow run's actual jobs. */
export function WorkflowRunDetail({ run, pools }: { run: WorkflowRun; pools: Pool[] }) {
  const shouldLoad = run.jobs === undefined;
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (workflowRun: WorkflowRun) => workflowRunJobs(workflowRun),
    [run],
    { execute: shouldLoad, keepPreviousData: true },
  );
  const jobs = run.jobs ?? data ?? [];

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${run.repository} / ${run.workflow}`}
      searchBarPlaceholder="Filter jobs"
    >
      {jobs.map((job) => {
        const duration = jobDuration(job);
        const location = jobLocation(job, pools) ?? (job.status === "queued" ? "Runner not assigned" : undefined);
        return (
          <List.Item
            key={job.id}
            icon={Icon.Hammer}
            title={job.name}
            accessories={[
              ...(location ? [{ text: location }] : []),
              ...(duration ? [{ text: duration }] : []),
              { tag: { value: jobStatus(job), color: statusColor(job) } },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open Job on GitHub" icon={Icon.ArrowNe} url={job.url || run.url} />
                <Action.OpenInBrowser title="Open Run on GitHub" icon={Icon.ArrowNe} url={run.url} />
                <Action.CopyToClipboard title="Copy Job URL" content={job.url || run.url} />
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
              </ActionPanel>
            }
          />
        );
      })}

      {!isLoading && error && (
        <List.EmptyView icon={Icon.Warning} title="Could Not Read Jobs" description={errorMessage(error)} />
      )}
      {!isLoading && !error && jobs.length === 0 && (
        <List.EmptyView
          icon={Icon.Clock}
          title="No Jobs Recorded"
          description="GitHub has no jobs to show for this workflow run."
        />
      )}
    </List>
  );
}
