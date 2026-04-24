import { Action, ActionPanel, Detail } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getErrorMessage } from "../lib/errors";
import { formatDuration, formatRelativeDateTime } from "../lib/format";
import { GitHubClient } from "../services/github-client";
import type { GitHubWorkflowRun } from "../types/github";

interface RunDetailProps {
  client: GitHubClient;
  repoFullName: string;
  run: GitHubWorkflowRun;
}

export function RunDetail({ client, repoFullName, run }: RunDetailProps) {
  const { data: jobs, isLoading } = useCachedPromise(() => client.listRunJobs(repoFullName, run.id), [], {
    onError: (error) => {
      console.error(getErrorMessage(error));
    },
  });

  const markdown = [
    `# ${run.workflowName}`,
    "",
    `- Repository: ${repoFullName}`,
    `- Branch: ${run.headBranch}`,
    `- Event: ${run.event}`,
    `- Status: ${run.status}${run.conclusion ? ` / ${run.conclusion}` : ""}`,
    `- Actor: ${run.actor?.login ?? "Unknown"}`,
    `- Started: ${formatRelativeDateTime(run.runStartedAt ?? run.updatedAt)}`,
    `- Duration: ${formatDuration(run.runStartedAt, run.updatedAt)}`,
    "",
    "## Jobs",
    ...(jobs?.length
      ? jobs.map((job) => `- ${job.name}: ${job.status}${job.conclusion ? ` / ${job.conclusion}` : ""}`)
      : [isLoading ? "- Loading jobs..." : "- No jobs found."]),
  ].join("\n");

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={run.htmlUrl} />
          <Action.CopyToClipboard title="Copy Run URL" content={run.htmlUrl} />
        </ActionPanel>
      }
    />
  );
}
